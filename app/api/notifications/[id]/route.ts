import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export const runtime = 'nodejs';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await currentUser();
    if (!user) {
        return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const { isRead } = await request.json();

    try {
        const notification = await prisma.notification.update({
            where: {
                id,
                userId: user.id, // Ensure user can only update their own notifications
            },
            data: {
                isRead,
            },
        });

        return Response.json(notification);
    } catch (error) {
        console.error("Error updating notification:", error);
        return Response.json({ error: "Failed to update notification" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await currentUser();
    if (!user) {
        return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;

    try {
        await prisma.notification.delete({
            where: {
                id,
                userId: user.id, // Ensure user can only delete their own notifications
            },
        });

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error deleting notification:", error);
        return Response.json({ error: "Failed to delete notification" }, { status: 500 });
    }
}