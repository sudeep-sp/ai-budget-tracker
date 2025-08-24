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
    const { fromUserId, toUserId, amount, relatedExpenses } = await request.json();

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

        // Record the settlement
        const settlement = await prisma.settlement.create({
            data: {
                groupId,
                fromUserId,
                toUserId,
                amount,
                method: "settlement_suggestion",
                notes: `Settlement suggested by system, recorded by ${userMember.name}`,
            },
        });

        // Create payment records and mark splits as paid
        if (relatedExpenses && relatedExpenses.length > 0) {
            // First, get splits that need payment records (not fully paid yet)
            const splits = await prisma.expenseSplit.findMany({
                where: {
                    expense: {
                        id: { in: relatedExpenses },
                        groupId,
                    },
                    userId: fromUserId,
                },
                include: {
                    payments: true,
                },
            });

            // Use transaction to ensure atomicity
            await prisma.$transaction(async (tx) => {
                const paymentPromises = splits.map(split => {
                    // Calculate remaining amount after existing payments
                    const totalPaid = split.payments.reduce((sum, payment) => sum + payment.amount, 0);
                    const remainingAmount = Math.max(0, split.amount - totalPaid);

                    if (remainingAmount > 0) {
                        return tx.expensePayment.create({
                            data: {
                                splitId: split.id,
                                paidBy: fromUserId,
                                amount: remainingAmount,
                                method: "settlement",
                                notes: `Settlement payment (Settlement ID: ${settlement.id})`,
                            },
                        });
                    }
                    return null;
                }).filter(Boolean);

                await Promise.all(paymentPromises);

                // Mark splits as paid only for splits that had payment records created
                const splitsToMarkPaid = splits.filter(split => {
                    const totalPaid = split.payments.reduce((sum, payment) => sum + payment.amount, 0);
                    const remainingAmount = Math.max(0, split.amount - totalPaid);
                    return remainingAmount > 0; // Only splits that had remaining amounts (and thus got payment records)
                });

                if (splitsToMarkPaid.length > 0) {
                    await tx.expenseSplit.updateMany({
                        where: {
                            id: { in: splitsToMarkPaid.map(s => s.id) },
                            isPaid: false, // Only mark unpaid splits as paid
                        },
                        data: { isPaid: true },
                    });
                }
            });
        }

        // Log activity
        await prisma.groupActivity.create({
            data: {
                groupId,
                userId: user.id,
                action: "settlement_made",
                details: JSON.stringify({
                    settlementId: settlement.id,
                    fromUserId,
                    toUserId,
                    amount,
                    relatedExpenses,
                }),
            },
        });

        return Response.json({
            success: true,
            settlement: {
                id: settlement.id,
                amount,
                settledAt: settlement.settledAt,
            },
        });
    } catch (error) {
        console.error("Error recording settlement:", error);
        return Response.json({ error: "Failed to record settlement" }, { status: 500 });
    }
}
