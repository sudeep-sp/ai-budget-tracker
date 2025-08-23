import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { CreateGroupSchema, InviteMemberSchema } from "@/schema/shared-expenses";
import { generateInvitationToken } from "@/lib/shared-utils";

export const runtime = 'nodejs';


export async function GET(request: NextRequest) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    try {
        const groups = await prisma.expenseGroup.findMany({
            where: {
                members: {
                    some: {
                        userId: user.id,
                        isActive: true,
                    },
                },
                isActive: true,
            },
            include: {
                members: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        userId: true,
                        name: true,
                        email: true,
                        role: true,
                        joinedAt: true,
                    },
                },
                expenses: {
                    select: {
                        id: true,
                        amount: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 5,
                },
                _count: {
                    select: {
                        expenses: true,
                        members: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        // Calculate summary stats for each group
        const groupSummaries = groups.map(group => {
            const totalExpenses = group.expenses.reduce((sum, expense) => sum + expense.amount, 0);
            const userMember = group.members.find(member => member.userId === user.id);

            return {
                id: group.id,
                name: group.name,
                description: group.description,
                currency: group.currency,
                memberCount: group._count.members,
                expenseCount: group._count.expenses,
                totalExpenses,
                userRole: userMember?.role || "member",
                recentActivity: group.expenses.length,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
            };
        });

        return Response.json(groupSummaries);
    } catch (error) {
        console.error("Error fetching groups:", error);
        return Response.json({ error: "Failed to fetch groups" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    try {
        const body = await request.json();
        const parsedBody = CreateGroupSchema.safeParse(body);

        if (!parsedBody.success) {
            return Response.json(
                { error: "Invalid input", details: parsedBody.error.issues },
                { status: 400 }
            );
        }

        const { name, description, currency } = parsedBody.data;

        // Create group with the user as owner
        const group = await prisma.expenseGroup.create({
            data: {
                name,
                description,
                currency,
                createdBy: user.id,
                members: {
                    create: {
                        userId: user.id,
                        name: user.firstName || user.emailAddresses[0]?.emailAddress || "User",
                        email: user.emailAddresses[0]?.emailAddress || "",
                        role: "owner",
                        permissions: JSON.stringify(["read", "write_transactions", "delete_transactions", "manage_categories", "manage_members", "manage_settings"]),
                    },
                },
            },
            include: {
                members: {
                    select: {
                        id: true,
                        userId: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        // Log group creation activity
        await prisma.groupActivity.create({
            data: {
                groupId: group.id,
                userId: user.id,
                action: "group_created",
                details: JSON.stringify({
                    groupName: name,
                    memberCount: 1,
                }),
            },
        });

        return Response.json(group, { status: 201 });
    } catch (error) {
        console.error("Error creating group:", error);
        return Response.json({ error: "Failed to create group" }, { status: 500 });
    }
}
