import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const runtime = 'nodejs';

export async function POST() {
    const user = await currentUser();
    if (!user) {
        return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
        const updatedNotifications = await prisma.notification.updateMany({
            where: {
                userId: user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        return Response.json({
            success: true,
            updatedCount: updatedNotifications.count,
        });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        return Response.json({ error: "Failed to mark notifications as read" }, { status: 500 });
    }
}