import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export const runtime = 'nodejs';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { groupId } = await params;
    const { expenseId, reminderType, message } = await request.json();

    try {
        // Verify user is member of group
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

        // Get the expense and its splits
        const expense = await prisma.sharedExpense.findUnique({
            where: {
                id: expenseId,
                groupId, // Ensure expense belongs to this group
            },
            include: {
                splits: {
                    include: {
                        payments: true,
                    },
                },
            },
        });

        if (!expense) {
            return Response.json({ error: "Expense not found" }, { status: 404 });
        }

        // Determine which members to remind
        let splitsToRemind = expense.splits;
        if (reminderType === "unpaid") {
            splitsToRemind = expense.splits.filter(split => {
                const totalPaid = split.payments.reduce((sum, payment) => sum + payment.amount, 0);
                return totalPaid < split.amount;
            });
        }

        // Get member details for reminder recipients
        const memberIds = splitsToRemind.map(split => split.userId);
        const members = await prisma.groupMember.findMany({
            where: {
                groupId,
                userId: { in: memberIds },
                isActive: true,
            },
        });

        // Create reminder records (for tracking purposes)
        const reminderRecords = await Promise.all(
            splitsToRemind.map(split =>
                prisma.groupActivity.create({
                    data: {
                        groupId,
                        userId: user.id,
                        action: "reminder_sent",
                        details: JSON.stringify({
                            expenseId,
                            splitId: split.id,
                            reminderType,
                            message,
                            recipientUserId: split.userId,
                            amount: split.amount,
                        }),
                    },
                })
            )
        );

        // TODO: Implement actual reminder notifications:
        // - Email notifications
        // - Push notifications
        // - In-app notifications
        // - SMS reminders

        return Response.json({
            success: true,
            remindersSent: splitsToRemind.length,
            recipients: members.map(member => ({
                userId: member.userId,
                name: member.name,
                email: member.email,
            })),
            message: `Reminders sent to ${splitsToRemind.length} member${splitsToRemind.length > 1 ? 's' : ''}`,
        });
    } catch (error) {
        console.error("Error sending reminders:", error);
        return Response.json({ error: "Failed to send reminders" }, { status: 500 });
    }
}