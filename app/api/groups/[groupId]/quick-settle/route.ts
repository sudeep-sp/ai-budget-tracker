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
    const { splitId, amount } = await request.json();

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

        // Get the split to validate
        const split = await prisma.expenseSplit.findUnique({
            where: { id: splitId },
            include: {
                expense: true,
                payments: true,
            },
        });

        if (!split || split.expense.groupId !== groupId) {
            return Response.json({ error: "Split not found" }, { status: 404 });
        }

        // Check if already fully paid
        const totalPaid = split.payments.reduce((sum, payment) => sum + payment.amount, 0);
        if (totalPaid >= split.amount) {
            return Response.json({ error: "Split is already fully paid" }, { status: 400 });
        }

        // Calculate remaining amount
        const remainingAmount = split.amount - totalPaid;
        const paymentAmount = Math.min(amount, remainingAmount);

        // Create payment record
        const payment = await prisma.expensePayment.create({
            data: {
                splitId,
                paidBy: user.id,
                amount: paymentAmount,
                method: "quick_settle",
                notes: "Quick settle payment",
            },
        });

        // Update split's isPaid status if fully paid
        const newTotalPaid = totalPaid + paymentAmount;
        if (newTotalPaid >= split.amount) {
            await prisma.expenseSplit.update({
                where: { id: splitId },
                data: { isPaid: true },
            });
        }

        // Log activity
        await prisma.groupActivity.create({
            data: {
                groupId,
                userId: user.id,
                action: "payment_made",
                details: JSON.stringify({
                    expenseId: split.expense.id,
                    splitId,
                    amount: paymentAmount,
                    method: "quick_settle",
                }),
            },
        });

        return Response.json({
            success: true,
            payment: {
                id: payment.id,
                amount: paymentAmount,
                isPaid: newTotalPaid >= split.amount,
            },
        });
    } catch (error) {
        console.error("Error recording quick settlement:", error);
        return Response.json({ error: "Failed to record settlement" }, { status: 500 });
    }
}
