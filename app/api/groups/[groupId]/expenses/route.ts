import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { CreateSharedExpenseSchema, validateSplits } from "@/schema/shared-expenses";
import { calculateSplits } from "@/lib/shared-utils";
import { verifyGroupAccess, verifyPermission } from "@/lib/group-utils";

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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    try {
        // Verify user is member of group
        await verifyGroupAccess(groupId, user.id);

        const expenses = await prisma.sharedExpense.findMany({
            where: { groupId },
            include: {
                splits: {
                    include: {
                        payments: {
                            orderBy: { date: "desc" },
                        },
                    },
                },
                attachments: true,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            skip: offset,
        });

        // Get member details for display
        const members = await prisma.groupMember.findMany({
            where: { groupId, isActive: true },
            select: { userId: true, name: true, email: true },
        });

        const memberMap = new Map(members.map(m => [m.userId, m]));

        // Enhance expenses with member info and payment status
        const enhancedExpenses = expenses.map(expense => ({
            ...expense,
            paidByName: memberMap.get(expense.paidBy)?.name || "Unknown",
            splits: expense.splits.map(split => ({
                ...split,
                userName: memberMap.get(split.userId)?.name || "Unknown",
                paidAmount: split.payments.reduce((sum, payment) => sum + payment.amount, 0),
                remainingAmount: split.amount - split.payments.reduce((sum, payment) => sum + payment.amount, 0),
            })),
        }));

        return Response.json(enhancedExpenses);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        return Response.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ groupId: string }> }
) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { groupId } = await params;

    try {
        const body = await request.json();

        const parsedBody = CreateSharedExpenseSchema.safeParse({
            ...body,
            groupId,
        });

        if (!parsedBody.success) {
            return Response.json(
                { error: "Invalid input", details: parsedBody.error.issues },
                { status: 400 }
            );
        }

        const { amount, description, category, categoryIcon, date, paidBy, splitType, splits, isRecurring, recurringConfig } = parsedBody.data;

        // Verify user has permission to add expenses
        await verifyPermission(groupId, user.id, "write_transactions");

        // Validate splits
        validateSplits(splitType, splits, amount);

        // Calculate actual split amounts
        const calculatedSplits = calculateSplits(amount, splitType, splits);

        // Create expense with splits in a transaction
        const expense = await prisma.$transaction(async (tx) => {
            // Create the expense
            const newExpense = await tx.sharedExpense.create({
                data: {
                    groupId,
                    paidBy,
                    amount,
                    description,
                    category,
                    categoryIcon,
                    date,
                    splitType,
                    splitData: JSON.stringify(splits),
                    isRecurring,
                    recurringConfig: recurringConfig ? JSON.stringify(recurringConfig) : null,
                },
            });

            // Create splits
            const expenseSplits = await Promise.all(
                calculatedSplits.map(split =>
                    tx.expenseSplit.create({
                        data: {
                            expenseId: newExpense.id,
                            userId: split.userId,
                            amount: split.amount,
                            isPaid: split.userId === paidBy, // Mark as paid if this is the person who paid
                            percentage: splitType === "percentage"
                                ? splits.find(s => s.userId === split.userId)?.percentage
                                : null,
                            shares: splitType === "shares"
                                ? splits.find(s => s.userId === split.userId)?.shares
                                : null,
                        },
                    })
                )
            );

            return { ...newExpense, splits: expenseSplits };
        });

        // Log activity
        await prisma.groupActivity.create({
            data: {
                groupId,
                userId: user.id,
                action: "expense_added",
                details: JSON.stringify({
                    expenseId: expense.id,
                    amount,
                    description,
                    splitType,
                    memberCount: splits.length,
                }),
            },
        });

        return Response.json(expense, { status: 201 });
    } catch (error) {
        console.error("Error creating expense:", error);
        return Response.json({ error: "Failed to create expense" }, { status: 500 });
    }
}
