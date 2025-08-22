import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { hasPermission } from "@/lib/shared-utils";

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

        // Soft delete the group
        await prisma.expenseGroup.update({
            where: { id: groupId },
            data: { isActive: false },
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
