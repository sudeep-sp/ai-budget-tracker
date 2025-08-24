import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { calculateBalances, generateSettlementSuggestions } from "@/lib/shared-utils";

export const runtime = 'nodejs';


export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { groupId } = await params;

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

        // Get all expenses and their splits with payments
        const expenses = await prisma.sharedExpense.findMany({
            where: { groupId },
            include: {
                splits: {
                    include: {
                        payments: true,
                    },
                },
            },
        });

        // Get all payments separately for balance calculation
        const payments = await prisma.expensePayment.findMany({
            where: {
                split: {
                    expense: {
                        groupId,
                    },
                },
            },
            include: {
                split: true,
            },
        });

        // Get all active members
        const members = await prisma.groupMember.findMany({
            where: { groupId, isActive: true },
            select: { userId: true, name: true, email: true },
        });

        // Calculate balances with error handling
        let balances, settlements;
        try {
            balances = calculateBalances(expenses, payments, members);
            settlements = generateSettlementSuggestions(balances, expenses);

            console.log("✅ Balance calculation complete:", {
                balancesCount: balances.length,
                paymentsCount: payments.length,
                userBalance: balances.find(b => b.userId === user.id)?.netBalance
            });
        } catch (error) {
            console.error("Error in balance calculation:", error);
            return Response.json({ error: "Failed to calculate balances" }, { status: 500 });
        }

        // Get current user's balance
        const userBalance = balances.find(b => b.userId === user.id);

        return Response.json({
            balances,
            settlements,
            userBalance,
            groupId,
            summary: {
                totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0),
                totalPaid: payments.reduce((sum, payment) => sum + payment.amount, 0),
                totalOwed: balances.reduce((sum, balance) => sum + Math.max(0, -balance.netBalance), 0),
                totalOwing: balances.reduce((sum, balance) => sum + Math.max(0, balance.netBalance), 0),
            },
        });
    } catch (error) {
        console.error("Error calculating balances:", error);
        return Response.json({ error: "Failed to calculate balances" }, { status: 500 });
    }
}
