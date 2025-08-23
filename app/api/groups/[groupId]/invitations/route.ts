import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

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
        // Check if user is a member of this group
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

        // Get pending invitations
        const invitations = await prisma.groupInvitation.findMany({
            where: {
                groupId,
                status: "pending",
                expiresAt: {
                    gte: new Date(),
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return Response.json(invitations);
    } catch (error) {
        console.error("Error fetching invitations:", error);
        return Response.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }
}
