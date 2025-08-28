import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { InviteMemberSchema } from "@/schema/shared-expenses";
import { generateInvitationToken, hasPermission } from "@/lib/shared-utils";

export const runtime = 'nodejs';


const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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
        const members = await prisma.groupMember.findMany({
            where: {
                groupId,
                group: {
                    members: {
                        some: {
                            userId: user.id,
                            isActive: true,
                        },
                    },
                },
                isActive: true,
            },
            orderBy: [
                { role: "desc" }, // owners first, then admins, then members
                { joinedAt: "asc" },
            ],
        });

        return Response.json(members);
    } catch (error) {
        console.error("Error fetching members:", error);
        return Response.json({ error: "Failed to fetch members" }, { status: 500 });
    }
}

export async function POST(
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
        const parsedBody = InviteMemberSchema.safeParse(body);

        if (!parsedBody.success) {
            return Response.json(
                { error: "Invalid input", details: parsedBody.error.issues },
                { status: 400 }
            );
        }

        const { email, role } = parsedBody.data;

        // Check if user has permission to manage members
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
        if (!hasPermission(userMember.role, permissions, "manage_members")) {
            return Response.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        // Check if the email corresponds to an existing Clerk user
        let targetUser = null;
        try {
            const users = await clerk.users.getUserList({
                emailAddress: [email],
            });

            if (users.data.length === 0) {
                return Response.json(
                    {
                        error: "User not found",
                        message: "This email address is not associated with any account. The person needs to sign up first before they can be invited to expense groups."
                    },
                    { status: 404 }
                );
            }

            targetUser = users.data[0];
        } catch (error) {
            console.error("Error checking Clerk user:", error);
            return Response.json(
                { error: "Failed to verify user account" },
                { status: 500 }
            );
        }

        // Check if user is already a member or has pending invitation
        const existingMember = await prisma.groupMember.findFirst({
            where: { groupId, userId: targetUser.id, isActive: true },
        });

        if (existingMember) {
            return Response.json(
                { error: "User is already a member of this group" },
                { status: 400 }
            );
        }

        const pendingInvitation = await prisma.groupInvitation.findFirst({
            where: { groupId, email, status: "pending" },
        });

        if (pendingInvitation) {
            return Response.json(
                { error: "Invitation already sent to this email" },
                { status: 400 }
            );
        }

        // Create invitation
        const token = generateInvitationToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to accept

        const invitation = await prisma.groupInvitation.create({
            data: {
                groupId,
                email,
                userId: targetUser.id, // Store the Clerk user ID
                invitedBy: user.id,
                token,
                expiresAt,
            },
            include: {
                group: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Log activity
        await prisma.groupActivity.create({
            data: {
                groupId,
                userId: user.id,
                action: "invitation_sent",
                details: JSON.stringify({
                    email,
                    role,
                }),
            },
        });

        // Create in-app notification for the invited user
        await prisma.notification.create({
            data: {
                userId: targetUser.id,
                type: "group_invitation",
                title: "Group Invitation",
                message: `${user.firstName || user.emailAddresses[0]?.emailAddress || "Someone"} invited you to join "${invitation.group.name}" expense group.`,
                data: JSON.stringify({
                    groupId,
                    groupName: invitation.group.name,
                    invitedBy: user.id,
                    inviterName: user.firstName || user.emailAddresses[0]?.emailAddress || "Someone",
                    token,
                    role,
                }),
                expiresAt: expiresAt,
            },
        });

        return Response.json({
            invitation,
            message: `Invitation sent directly to ${email}'s account. They will receive an in-app notification.`,
        }, { status: 201 });

    } catch (error) {
        console.error("Error inviting member:", error);
        return Response.json({ error: "Failed to invite member" }, { status: 500 });
    }
}
