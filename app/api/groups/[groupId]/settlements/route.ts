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

        // Mark related expense splits as paid
        if (relatedExpenses && relatedExpenses.length > 0) {
            await prisma.expenseSplit.updateMany({
                where: {
                    expense: {
                        id: { in: relatedExpenses },
                        groupId,
                    },
                    userId: fromUserId,
                },
                data: { isPaid: true },
            });

            // Create payment records for each split
            const splits = await prisma.expenseSplit.findMany({
                where: {
                    expense: {
                        id: { in: relatedExpenses },
                        groupId,
                    },
                    userId: fromUserId,
                },
            });

            const paymentPromises = splits.map(split =>
                prisma.expensePayment.create({
                    data: {
                        splitId: split.id,
                        paidBy: fromUserId,
                        amount: split.amount,
                        method: "settlement",
                        notes: `Settlement payment (Settlement ID: ${settlement.id})`,
                    },
                })
            );

            await Promise.all(paymentPromises);
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
