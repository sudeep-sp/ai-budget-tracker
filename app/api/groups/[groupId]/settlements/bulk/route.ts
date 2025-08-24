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
                const { fromUserId, toUserId, amount, relatedExpenses } = settlement;

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

                // Mark related expense splits as paid
                if (relatedExpenses && relatedExpenses.length > 0) {
                    await tx.expenseSplit.updateMany({
                        where: {
                            expense: {
                                id: { in: relatedExpenses },
                                groupId,
                            },
                            userId: fromUserId,
                        },
                        data: { isPaid: true },
                    });

                    // Create payment records for each split, accounting for existing payments
                    const splits = await tx.expenseSplit.findMany({
                        where: {
                            expense: {
                                id: { in: relatedExpenses },
                                groupId,
                            },
                            userId: fromUserId,
                            isPaid: false, // Only unpaid splits
                        },
                        include: {
                            payments: true,
                        },
                    });

                    for (const split of splits) {
                        // Calculate remaining amount after existing payments
                        const totalPaid = split.payments.reduce((sum, payment) => sum + payment.amount, 0);
                        const remainingAmount = Math.max(0, split.amount - totalPaid);

                        if (remainingAmount > 0) {
                            await tx.expensePayment.create({
                                data: {
                                    splitId: split.id,
                                    paidBy: fromUserId,
                                    amount: remainingAmount,
                                    method: "bulk_settlement",
                                    notes: `Bulk settlement payment (Settlement ID: ${settlementRecord.id})`,
                                },
                            });
                        }
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
