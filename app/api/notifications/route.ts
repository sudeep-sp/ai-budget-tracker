import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
    const user = await currentUser();
    if (!user) {
        return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: user.id,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: new Date() } }
                ]
            },
            orderBy: { createdAt: "desc" },
            take: 50, // Limit to last 50 notifications
        });

        return Response.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return Response.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
        const { type, title, message, data, expiresAt } = await request.json();

        const notification = await prisma.notification.create({
            data: {
                userId: user.id,
                type,
                title,
                message,
                data,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        return Response.json(notification);
    } catch (error) {
        console.error("Error creating notification:", error);
        return Response.json({ error: "Failed to create notification" }, { status: 500 });
    }
}