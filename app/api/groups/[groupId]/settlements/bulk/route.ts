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
    const { settlements } = await request.json();

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

        const results = await prisma.$transaction(async (tx) => {
            const settlementResults = [];

            for (const settlement of settlements) {
                const { fromUserId, toUserId, amount, relatedExpenses, isNetted = false } = settlement;

                // Record the settlement
                const settlementRecord = await tx.settlement.create({
                    data: {
                        groupId,
                        fromUserId,
                        toUserId,
                        amount,
                        method: "bulk_settlement",
                        notes: `Bulk settlement recorded by ${userMember.name}`,
                    },
                });

                // Handle settlement based on whether it's netted or not
                if (relatedExpenses && relatedExpenses.length > 0) {
                    if (isNetted) {
                        // Handle netted settlement - settle expenses in BOTH directions
                        await handleNettedSettlementInTransaction(tx, {
                            groupId,
                            fromUserId,
                            toUserId,
                            amount,
                            relatedExpenses,
                            settlementId: settlementRecord.id
                        });
                    } else {
                        // Handle regular settlement - only settle fromUserId's debts
                        await handleRegularSettlementInTransaction(tx, {
                            groupId,
                            fromUserId,
                            relatedExpenses,
                            settlementId: settlementRecord.id
                        });
                    }
                }

                settlementResults.push({
                    id: settlementRecord.id,
                    fromUserId,
                    toUserId,
                    amount,
                });
            }

            // Log activity
            await tx.groupActivity.create({
                data: {
                    groupId,
                    userId: user.id,
                    action: "bulk_settlement_made",
                    details: JSON.stringify({
                        settlementsCount: settlements.length,
                        totalAmount: settlements.reduce((sum: number, s: any) => sum + s.amount, 0),
                        settlements: settlementResults,
                    }),
                },
            });

            return settlementResults;
        });

        return Response.json({
            success: true,
            settlements: results,
            count: results.length,
        });
    } catch (error) {
        console.error("Error recording bulk settlements:", error);
        return Response.json({ error: "Failed to record bulk settlements" }, { status: 500 });
    }
}

/**
 * Handle netted settlement within an existing transaction
 */
async function handleNettedSettlementInTransaction(tx: any, params: {
    groupId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    relatedExpenses: string[];
    settlementId: string;
}) {
    const { groupId, fromUserId, toUserId, amount, relatedExpenses, settlementId } = params;

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
                        method: "bulk_netted_settlement",
                        notes: `Bulk netted settlement payment (Settlement ID: ${settlementId})`,
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
                        method: "bulk_netted_settlement",
                        notes: `Bulk netted settlement payment (Settlement ID: ${settlementId})`,
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
}

/**
 * Handle regular settlement within an existing transaction
 */
async function handleRegularSettlementInTransaction(tx: any, params: {
    groupId: string;
    fromUserId: string;
    relatedExpenses: string[];
    settlementId: string;
}) {
    const { groupId, fromUserId, relatedExpenses, settlementId } = params;

    const splits = await tx.expenseSplit.findMany({
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

    const paymentPromises = splits.map((split: any) => {
        const totalPaid = split.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
        const remainingAmount = Math.max(0, split.amount - totalPaid);

        if (remainingAmount > 0) {
            return tx.expensePayment.create({
                data: {
                    splitId: split.id,
                    paidBy: fromUserId,
                    amount: remainingAmount,
                    method: "bulk_settlement",
                    notes: `Bulk settlement payment (Settlement ID: ${settlementId})`,
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
}
