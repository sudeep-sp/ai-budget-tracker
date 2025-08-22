import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    try {
        const invitation = await prisma.groupInvitation.findFirst({
            where: {
                token,
                status: "pending",
                expiresAt: {
                    gte: new Date(),
                },
            },
            include: {
                group: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        currency: true,
                        _count: {
                            select: { members: true },
                        },
                    },
                },
            },
        });

        if (!invitation) {
            return Response.json({ error: "Invalid or expired invitation" }, { status: 404 });
        }

        return Response.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                groupName: invitation.group.name,
                groupDescription: invitation.group.description,
                memberCount: invitation.group._count.members,
                expiresAt: invitation.expiresAt,
            },
        });
    } catch (error) {
        console.error("Error fetching invitation:", error);
        return Response.json({ error: "Failed to fetch invitation" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { token } = await params;

    try {
        const body = await request.json();
        const { accept } = body; // true to accept, false to decline

        const invitation = await prisma.groupInvitation.findFirst({
            where: {
                token,
                status: "pending",
                expiresAt: {
                    gte: new Date(),
                },
            },
            include: {
                group: true,
            },
        });

        if (!invitation) {
            return Response.json({ error: "Invalid or expired invitation" }, { status: 404 });
        }

        // Check if user's email matches invitation
        const userEmail = user.emailAddresses[0]?.emailAddress;
        if (userEmail !== invitation.email) {
            return Response.json(
                { error: "This invitation is for a different email address" },
                { status: 403 }
            );
        }

        if (accept) {
            // Accept invitation - add user to group
            await prisma.$transaction(async (tx) => {
                // Add user as group member
                await tx.groupMember.create({
                    data: {
                        groupId: invitation.groupId,
                        userId: user.id,
                        name: user.firstName || user.emailAddresses[0]?.emailAddress || "User",
                        email: invitation.email,
                        role: "member",
                        permissions: JSON.stringify(["read", "write_transactions"]),
                    },
                });

                // Update invitation status
                await tx.groupInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "accepted" },
                });

                // Log activity
                await tx.groupActivity.create({
                    data: {
                        groupId: invitation.groupId,
                        userId: user.id,
                        action: "member_joined",
                        details: JSON.stringify({
                            email: invitation.email,
                            invitedBy: invitation.invitedBy,
                        }),
                    },
                });
            });

            return Response.json({
                message: "Successfully joined the group!",
                groupId: invitation.groupId,
                groupName: invitation.group.name,
            });
        } else {
            // Decline invitation
            await prisma.groupInvitation.update({
                where: { id: invitation.id },
                data: { status: "declined" },
            });

            return Response.json({ message: "Invitation declined" });
        }
    } catch (error) {
        console.error("Error processing invitation:", error);
        return Response.json({ error: "Failed to process invitation" }, { status: 500 });
    }
}
