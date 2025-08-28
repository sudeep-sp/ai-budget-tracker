import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export const runtime = 'nodejs';

export async function DELETE() {
    const user = await currentUser();
    if (!user) {
        return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
        const deletedNotifications = await prisma.notification.deleteMany({
            where: {
                userId: user.id,
            },
        });

        return Response.json({
            success: true,
            deletedCount: deletedNotifications.count,
        });
    } catch (error) {
        console.error("Error deleting all notifications:", error);
        return Response.json({ error: "Failed to delete notifications" }, { status: 500 });
    }
}