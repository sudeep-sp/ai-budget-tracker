import { GetFormatterForCurrency } from "@/lib/helpers";
import prisma from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schema/overview";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const runtime = 'nodejs';


export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const queryParams = OverviewQuerySchema.safeParse({ from, to });

    if (!queryParams.success) {
        return Response.json(queryParams.error.message, { status: 400 });
    }

    const transactions = await getTransactionsHistory(user.id, queryParams.data.from, queryParams.data.to);

    return Response.json(transactions);
}

export type GetTransactionsHistoryResponseType = Awaited<ReturnType<typeof getTransactionsHistory>>

async function getTransactionsHistory(userId: string, from: Date, to: Date) {
    const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
    })

    if (!userSettings) {
        throw new Error("User settings not found");
    }

    const formatter = GetFormatterForCurrency(userSettings.currency)

    // Get individual transactions
    const individualTransactions = await prisma.transaction.findMany({
        where: {
            userId,
            date: {
                gte: from,
                lte: to,
            }
        },
        orderBy: {
            date: "asc"
        }
    })

    // Get shared expenses where user is a member (only from active groups)
    const userGroups = await prisma.groupMember.findMany({
        where: {
            userId,
            isActive: true
        },
        include: {
            group: {
                include: {
                    expenses: {
                        where: {
                            date: {
                                gte: from,
                                lte: to
                            }
                        },
                        include: {
                            splits: {
                                where: {
                                    userId
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Convert shared expenses to transaction format (only from active groups)
    const sharedTransactions: any[] = [];

    userGroups.forEach((groupMember: any) => {
        // Only process expenses from active groups
        if (groupMember.group.isActive) {
            groupMember.group.expenses.forEach((expense: any) => {
                const userSplit = expense.splits.find((split: any) => split.userId === userId);
                if (userSplit) {
                    sharedTransactions.push({
                        id: `shared-${expense.id}-${userSplit.id}`,
                        createdAt: expense.createdAt,
                        updatedAt: expense.updatedAt,
                        amount: userSplit.amount,
                        description: `${expense.description} (Shared - ${groupMember.group.name})`,
                        date: expense.date,
                        userId: userId,
                        type: "expense",
                        category: expense.category,
                        categoryIcon: expense.categoryIcon,
                        groupId: expense.groupId,
                        isShared: true,
                        groupName: groupMember.group.name,
                        originalExpenseId: expense.id
                    });
                }
            });
        }
    });

    // Combine and sort all transactions
    const allTransactions = [
        ...individualTransactions.map(t => ({ ...t, isShared: false })),
        ...sharedTransactions
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return allTransactions.map(transaction => ({
        ...transaction,
        formattedAmount: formatter.format(transaction.amount),
    }))
}
