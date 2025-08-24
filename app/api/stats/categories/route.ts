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
        throw new Error(queryParams.error.message);
    }

    const stats = await getCategoriesStats(user.id, queryParams.data.from, queryParams.data.to);

    return Response.json(stats);
}

export type GetCategoriesStatsResponseType = Awaited<ReturnType<typeof getCategoriesStats>>;

async function getCategoriesStats(userId: string, from: Date, to: Date) {
    // Get individual transactions
    const individualStats = await prisma.transaction.groupBy({
        by: ["type", "category", "categoryIcon"],
        where: {
            userId,
            date: {
                gte: from,
                lte: to
            },
        },
        _sum: {
            amount: true
        },
        orderBy: {
            _sum: {
                amount: "desc"
            }
        }
    });

    // Get shared expenses where user is a member
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

    // Process shared expenses and group by category
    const sharedExpensesByCategory: { [key: string]: { amount: number; categoryIcon: string; type: string } } = {};

    userGroups.forEach((groupMember: any) => {
        groupMember.group.expenses.forEach((expense: any) => {
            const userSplit = expense.splits.find((split: any) => split.userId === userId);
            if (userSplit) {
                const categoryKey = `${expense.category}-${expense.categoryIcon}-expense`;
                if (!sharedExpensesByCategory[categoryKey]) {
                    sharedExpensesByCategory[categoryKey] = {
                        amount: 0,
                        categoryIcon: expense.categoryIcon,
                        type: "expense"
                    };
                }
                sharedExpensesByCategory[categoryKey].amount += userSplit.amount;
            }
        });
    });

    // Convert shared expenses to the same format as individual stats
    const sharedStats = Object.entries(sharedExpensesByCategory).map(([categoryKey, data]) => {
        const [category] = categoryKey.split('-');
        return {
            type: data.type,
            category: category,
            categoryIcon: data.categoryIcon,
            _sum: {
                amount: data.amount
            }
        };
    });

    // Combine individual and shared stats
    const combinedStats = [...individualStats, ...sharedStats];

    // Group by category and sum amounts
    const finalStats: { [key: string]: any } = {};
    
    combinedStats.forEach((stat: any) => {
        const key = `${stat.type}-${stat.category}-${stat.categoryIcon}`;
        if (!finalStats[key]) {
            finalStats[key] = {
                type: stat.type,
                category: stat.category,
                categoryIcon: stat.categoryIcon,
                _sum: { amount: 0 }
            };
        }
        finalStats[key]._sum.amount += stat._sum.amount;
    });

    // Convert back to array and sort by amount
    return Object.values(finalStats).sort((a: any, b: any) => b._sum.amount - a._sum.amount);
}
