import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { hasPermission } from "@/lib/shared-utils";

export const runtime = 'nodejs';


export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { groupId } = await params;

    try {
        const group = await prisma.expenseGroup.findFirst({
            where: {
                id: groupId,
                members: {
                    some: {
                        userId: user.id,
                        isActive: true,
                    },
                },
            },
            include: {
                members: {
                    where: { isActive: true },
                    orderBy: { joinedAt: "asc" },
                },
                expenses: {
                    include: {
                        splits: {
                            include: {
                                payments: true,
                            },
                        },
                        attachments: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                },
                _count: {
                    select: {
                        expenses: true,
                        members: true,
                    },
                },
            },
        });

        if (!group) {
            return Response.json({ error: "Group not found" }, { status: 404 });
        }

        return Response.json(group);
    } catch (error) {
        console.error("Error fetching group:", error);
        return Response.json({ error: "Failed to fetch group" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { groupId } = await params;

    try {
        const body = await request.json();
        const { name, description, currency } = body;

        // Check if user has permission to manage settings
        const userMember = await prisma.groupMember.findFirst({
            where: {
                groupId,
                userId: user.id,
                isActive: true,
            },
        });

        if (!userMember) {
            return Response.json({ error: "Not a member of this group" }, { status: 403 });
        }

        const permissions = JSON.parse(userMember.permissions || "[]");
        if (!hasPermission(userMember.role, permissions, "manage_settings")) {
            return Response.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const updatedGroup = await prisma.expenseGroup.update({
            where: { id: groupId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(currency && { currency }),
                updatedAt: new Date(),
            },
            include: {
                members: {
                    where: { isActive: true },
                },
            },
        });

        // Log activity
        await prisma.groupActivity.create({
            data: {
                groupId,
                userId: user.id,
                action: "group_updated",
                details: JSON.stringify({
                    changes: { name, description, currency },
                }),
            },
        });

        return Response.json(updatedGroup);
    } catch (error) {
        console.error("Error updating group:", error);
        return Response.json({ error: "Failed to update group" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { groupId } = await params;

    try {
        // Check if user is the owner
        const userMember = await prisma.groupMember.findFirst({
            where: {
                groupId,
                userId: user.id,
                role: "owner",
                isActive: true,
            },
        });

        if (!userMember) {
            return Response.json(
                { error: "Only group owners can delete groups" },
                { status: 403 }
            );
        }

        // Convert shared expenses to individual transactions for all members
        await prisma.$transaction(async (tx) => {
            // Get all expenses in the group
            const expenses = await tx.sharedExpense.findMany({
                where: { groupId },
                include: {
                    splits: true,
                },
            });

            // Convert each expense to individual transactions
            for (const expense of expenses) {
                for (const split of expense.splits) {
                    // Create individual transaction for each member's split
                    await tx.transaction.create({
                        data: {
                            amount: split.amount,
                            description: `${expense.description} (from deleted group)`,
                            date: expense.date,
                            userId: split.userId,
                            type: "expense",
                            category: expense.category,
                            categoryIcon: expense.categoryIcon,
                        },
                    });

                    // Update history records
                    await tx.monthHistory.upsert({
                        where: {
                            day_month_year_userId: {
                                userId: split.userId,
                                day: expense.date.getUTCDate(),
                                month: expense.date.getUTCMonth(),
                                year: expense.date.getUTCFullYear(),
                            },
                        },
                        update: {
                            expense: {
                                increment: split.amount,
                            },
                        },
                        create: {
                            userId: split.userId,
                            day: expense.date.getUTCDate(),
                            month: expense.date.getUTCMonth(),
                            year: expense.date.getUTCFullYear(),
                            income: 0,
                            expense: split.amount,
                        },
                    });

                    await tx.yearHistory.upsert({
                        where: {
                            month_year_userId: {
                                userId: split.userId,
                                month: expense.date.getUTCMonth(),
                                year: expense.date.getUTCFullYear(),
                            },
                        },
                        update: {
                            expense: {
                                increment: split.amount,
                            },
                        },
                        create: {
                            userId: split.userId,
                            month: expense.date.getUTCMonth(),
                            year: expense.date.getUTCFullYear(),
                            income: 0,
                            expense: split.amount,
                        },
                    });
                }
            }

            // Delete all expense splits and payments
            await tx.expensePayment.deleteMany({
                where: {
                    split: {
                        expense: {
                            groupId,
                        },
                    },
                },
            });

            await tx.expenseSplit.deleteMany({
                where: {
                    expense: {
                        groupId,
                    },
                },
            });

            // Delete all expense attachments
            await tx.expenseAttachment.deleteMany({
                where: {
                    expense: {
                        groupId,
                    },
                },
            });

            // Delete all expenses
            await tx.sharedExpense.deleteMany({
                where: { groupId },
            });

            // Delete all settlements
            await tx.settlement.deleteMany({
                where: { groupId },
            });

            // Delete all group activity
            await tx.groupActivity.deleteMany({
                where: { groupId },
            });

            // Delete all invitations
            await tx.groupInvitation.deleteMany({
                where: { groupId },
            });

            // Delete all members
            await tx.groupMember.deleteMany({
                where: { groupId },
            });

            // Finally, delete the group
            await tx.expenseGroup.delete({
                where: { id: groupId },
            });
        });

        // Log activity
        await prisma.groupActivity.create({
            data: {
                groupId,
                userId: user.id,
                action: "group_deleted",
                details: JSON.stringify({}),
            },
        });

        return Response.json({ message: "Group deleted successfully" });
    } catch (error) {
        console.error("Error deleting group:", error);
        return Response.json({ error: "Failed to delete group" }, { status: 500 });
    }
}
