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
    const { fromUserId, toUserId, amount, relatedExpenses, isNetted = false } = await request.json();

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
            if (isNetted) {
                // Handle netted settlement - settle expenses in BOTH directions
                await handleNettedSettlement(prisma, {
                    groupId,
                    fromUserId,
                    toUserId,
                    amount,
                    relatedExpenses,
                    settlementId: settlement.id
                });
            } else {
                // Handle regular settlement - only settle fromUserId's debts
                await handleRegularSettlement(prisma, {
                    groupId,
                    fromUserId,
                    relatedExpenses,
                    settlementId: settlement.id
                });
            }
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

/**
 * Handle netted settlement - settle expenses in BOTH directions
 */
async function handleNettedSettlement(prisma: any, params: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    relatedExpenses: string[];
    settlementId: string;
}) {
    const { groupId, fromUserId, toUserId, amount, relatedExpenses, settlementId } = params;

    await prisma.$transaction(async (tx: any) => {
        // Get ALL splits for both users in the related expenses
        const allSplits = await tx.expenseSplit.findMany({
            where: {
                expense: {
                    id: { in: relatedExpenses },
                    groupId,
                },
                OR: [
                    { userId: fromUserId },
                    { userId: toUserId }
                ]
            },
            include: {
                payments: true,
                expense: true
            },
        });

        // Separate splits by direction
        const fromUserSplits = allSplits.filter((split: any) =>
            split.userId === fromUserId && split.expense.paidBy === toUserId
        );
        const toUserSplits = allSplits.filter((split: any) =>
            split.userId === toUserId && split.expense.paidBy === fromUserId
        );

        // Calculate total amounts in each direction
        let fromUserOwes = 0;
        let toUserOwes = 0;

        fromUserSplits.forEach((split: any) => {
            const totalPaid = split.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            const remainingAmount = Math.max(0, split.amount - totalPaid);
            if (!split.isPaid) {
                fromUserOwes += remainingAmount;
            }
        });

        toUserSplits.forEach((split: any) => {
            const totalPaid = split.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            const remainingAmount = Math.max(0, split.amount - totalPaid);
            if (!split.isPaid) {
                toUserOwes += remainingAmount;
            }
        });

        // The netted amount should match what we're settling
        const expectedNet = fromUserOwes - toUserOwes;
        // Log settlement details for debugging (removed console.log for production)

        // Create payment records for ALL unpaid splits from both users
        const paymentPromises: any[] = [];

        // Settle fromUser's debts
        fromUserSplits.forEach((split: any) => {
            const totalPaid = split.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            const remainingAmount = Math.max(0, split.amount - totalPaid);
            if (remainingAmount > 0 && !split.isPaid) {
                paymentPromises.push(
                    tx.expensePayment.create({
                        data: {
                            splitId: split.id,
                            paidBy: fromUserId,
                            amount: remainingAmount,
                            method: "netted_settlement",
                            notes: `Netted settlement payment (Settlement ID: ${settlementId})`,
                        },
                    })
                );
            }
        });

        // Settle toUser's debts
        toUserSplits.forEach((split: any) => {
            const totalPaid = split.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            const remainingAmount = Math.max(0, split.amount - totalPaid);
            if (remainingAmount > 0 && !split.isPaid) {
                paymentPromises.push(
                    tx.expensePayment.create({
                        data: {
                            splitId: split.id,
                            paidBy: toUserId,
                            amount: remainingAmount,
                            method: "netted_settlement",
                            notes: `Netted settlement payment (Settlement ID: ${settlementId})`,
                        },
                    })
                );
            }
        });

        await Promise.all(paymentPromises);

        // Mark all involved splits as paid
        const splitsToMarkPaid = [...fromUserSplits, ...toUserSplits].filter((split: any) => !split.isPaid);

        if (splitsToMarkPaid.length > 0) {
            await tx.expenseSplit.updateMany({
                where: {
                    id: { in: splitsToMarkPaid.map((s: any) => s.id) },
                    isPaid: false,
                },
                data: { isPaid: true },
            });
        }
    });
}

/**
 * Handle regular settlement - only settle fromUserId's debts
 */
async function handleRegularSettlement(prisma: any, params: {
    groupId: string;
    fromUserId: string;
    relatedExpenses: string[];
    settlementId: string;
}) {
    const { groupId, fromUserId, relatedExpenses, settlementId } = params;

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

    await prisma.$transaction(async (tx: any) => {
        const paymentPromises = splits.map((split: any) => {
            const totalPaid = split.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            const remainingAmount = Math.max(0, split.amount - totalPaid);

            if (remainingAmount > 0) {
                return tx.expensePayment.create({
                    data: {
                        splitId: split.id,
                        paidBy: fromUserId,
                        amount: remainingAmount,
                        method: "settlement",
                        notes: `Settlement payment (Settlement ID: ${settlementId})`,
                    },
                });
            }
            return null;
        }).filter(Boolean);

        await Promise.all(paymentPromises);

        const splitsToMarkPaid = splits.filter((split: any) => {
            const totalPaid = split.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
            const remainingAmount = Math.max(0, split.amount - totalPaid);
            return remainingAmount > 0;
        });

        if (splitsToMarkPaid.length > 0) {
            await tx.expenseSplit.updateMany({
                where: {
                    id: { in: splitsToMarkPaid.map((s: any) => s.id) },
                    isPaid: false,
                },
                data: { isPaid: true },
            });
        }
    });
}
