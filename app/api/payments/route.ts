import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { RecordPaymentSchema } from "@/schema/shared-expenses";

export async function POST(request: NextRequest) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    try {
        const body = await request.json();
        const parsedBody = RecordPaymentSchema.safeParse(body);

        if (!parsedBody.success) {
            return Response.json(
                { error: "Invalid input", details: parsedBody.error.issues },
                { status: 400 }
            );
        }

        const { splitId, amount, method, notes, date } = parsedBody.data;

        // Get split details and verify permissions
        const split = await prisma.expenseSplit.findFirst({
            where: { id: splitId },
            include: {
                expense: {
                    include: {
                        group: {
                            include: {
                                members: {
                                    where: { userId: user.id, isActive: true },
                                },
                            },
                        },
                    },
                },
                payments: true,
            },
        });

        if (!split) {
            return Response.json({ error: "Split not found" }, { status: 404 });
        }

        if (split.expense.group.members.length === 0) {
            return Response.json({ error: "Not a member of this group" }, { status: 403 });
        }

        // Check if payment amount would exceed what's owed
        const alreadyPaid = split.payments.reduce((sum, payment) => sum + payment.amount, 0);
        const remainingAmount = split.amount - alreadyPaid;

        if (amount > remainingAmount) {
            return Response.json(
                { error: `Payment amount exceeds remaining balance of ${remainingAmount}` },
                { status: 400 }
            );
        }

        // Create payment
        const payment = await prisma.expensePayment.create({
            data: {
                splitId,
                paidBy: user.id,
                amount,
                method,
                notes,
                date,
            },
        });

        // Update split paid status if fully paid
        const newTotalPaid = alreadyPaid + amount;
        if (Math.abs(newTotalPaid - split.amount) < 0.01) {
            await prisma.expenseSplit.update({
                where: { id: splitId },
                data: { isPaid: true },
            });
        }

        // Log activity
        await prisma.groupActivity.create({
            data: {
                groupId: split.expense.groupId,
                userId: user.id,
                action: "payment_made",
                details: JSON.stringify({
                    expenseId: split.expense.id,
                    splitId,
                    amount,
                    method,
                    expenseDescription: split.expense.description,
                }),
            },
        });

        return Response.json(payment, { status: 201 });
    } catch (error) {
        console.error("Error recording payment:", error);
        return Response.json({ error: "Failed to record payment" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const userId = searchParams.get("userId");

    try {
        let whereClause: any = {
            split: {
                expense: {
                    group: {
                        members: {
                            some: {
                                userId: user.id,
                                isActive: true,
                            },
                        },
                    },
                },
            },
        };

        if (groupId) {
            whereClause.split.expense.groupId = groupId;
        }

        if (userId) {
            whereClause.split.userId = userId;
        }

        const payments = await prisma.expensePayment.findMany({
            where: whereClause,
            include: {
                split: {
                    include: {
                        expense: {
                            select: {
                                id: true,
                                description: true,
                                amount: true,
                                category: true,
                                date: true,
                                groupId: true,
                            },
                        },
                    },
                },
            },
            orderBy: { date: "desc" },
            take: 50,
        });

        // Get member names for display
        const groupIds = [...new Set(payments.map(p => p.split.expense.groupId))];
        const members = await prisma.groupMember.findMany({
            where: {
                groupId: { in: groupIds },
                isActive: true,
            },
            select: { userId: true, name: true, groupId: true },
        });

        const memberMap = new Map(members.map(m => [`${m.groupId}-${m.userId}`, m.name]));

        // Enhance payments with member names
        const enhancedPayments = payments.map(payment => ({
            ...payment,
            paidByName: memberMap.get(`${payment.split.expense.groupId}-${payment.paidBy}`) || "Unknown",
            splitUserName: memberMap.get(`${payment.split.expense.groupId}-${payment.split.userId}`) || "Unknown",
        }));

        return Response.json(enhancedPayments);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return Response.json({ error: "Failed to fetch payments" }, { status: 500 });
    }
}
