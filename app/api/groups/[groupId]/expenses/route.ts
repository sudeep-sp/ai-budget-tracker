import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { CreateSharedExpenseSchema, validateSplits } from "@/schema/shared-expenses";
import { calculateSplits, hasPermission } from "@/lib/shared-utils";

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
        console.log("Received body:", JSON.stringify(body, null, 2));

        const parsedBody = CreateSharedExpenseSchema.safeParse({
            ...body,
            groupId,
        });

        if (!parsedBody.success) {
            console.log("Validation failed:", JSON.stringify(parsedBody.error.issues, null, 2));
            return Response.json(
                { error: "Invalid input", details: parsedBody.error.issues },
                { status: 400 }
            );
        }

        const { amount, description, category, categoryIcon, date, paidBy, splitType, splits, isRecurring, recurringConfig } = parsedBody.data;

        // Verify user has permission to add expenses
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

        const permissions = JSON.parse(userMember.permissions || "[]");
        if (!hasPermission(userMember.role, permissions, "write_transactions")) {
            return Response.json({ error: "Insufficient permissions" }, { status: 403 });
        }

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
