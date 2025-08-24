import prisma from "@/lib/prisma";
import { Period, Timeframe } from "@/lib/types";
import { currentUser } from "@clerk/nextjs/server";
import { getDaysInMonth } from "date-fns";
import { redirect } from "next/navigation";
import z from "zod/v3";

export const runtime = 'nodejs';



const getHistoryDataSchema = z.object({
    timeframe: z.enum(["year", "month"]),
    year: z.coerce.number().min(2000).max(3000),
    month: z.coerce.number().min(0).max(11).default(0)
})
export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const queryParams = getHistoryDataSchema.safeParse({
        timeframe,
        month,
        year,
    });

    if (!queryParams.success) {
        return Response.json(queryParams.error.message, { status: 400 });
    }

    const data = await getHistoryData(user.id, queryParams.data.timeframe, {
        month: queryParams.data.month,
        year: queryParams.data.year
    })

    return Response.json(data);
}

export type GetHistoryDataResponseType = Awaited<ReturnType<typeof getHistoryData>>;

async function getHistoryData(userId: string, timeframe: Timeframe, period: Period) {

    switch (timeframe) {
        case "year":
            return await getYearHistory(userId, period.year);
        case "month":
            return await getMonthHistory(userId, period.year, period.month);
    }
}
type HistoryData = {
    expense: number;
    income: number;
    year: number;
    month: number;
    day?: number;
}
async function getYearHistory(userId: string, year: number) {
    const result = await prisma.yearHistory.groupBy({
        by: ["month"],
        where: {
            userId,
            year
        },
        _sum: {
            expense: true,
            income: true
        },
        orderBy: [{
            month: "asc"
        }]
    });

    // Get shared expenses for the year
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
                                gte: new Date(year, 0, 1),
                                lte: new Date(year, 11, 31, 23, 59, 59)
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

    // Calculate shared expenses by month
    const sharedExpensesByMonth: { [month: number]: number } = {};
    
    userGroups.forEach((groupMember: any) => {
        groupMember.group.expenses.forEach((expense: any) => {
            const userSplit = expense.splits.find((split: any) => split.userId === userId);
            if (userSplit) {
                const month = expense.date.getMonth();
                sharedExpensesByMonth[month] = (sharedExpensesByMonth[month] || 0) + userSplit.amount;
            }
        });
    });

    if (!result || result.length === 0) return [];

    const history: HistoryData[] = [];

    for (let i = 0; i < 12; i++) {
        let expense = 0;
        let income = 0;

        const month = result.find(row => row.month === i);
        if (month) {
            expense = month._sum.expense || 0;
            income = month._sum.income || 0;
        }

        // Add shared expenses to the month
        const sharedExpenses = sharedExpensesByMonth[i] || 0;
        expense += sharedExpenses;

        history.push({
            expense,
            income,
            year,
            month: i
        });
    }

    return history;
}

async function getMonthHistory(userId: string, year: number, month: number) {
    const result = await prisma.monthHistory.groupBy({
        by: ["day"],
        where: {
            userId,
            year,
            month
        },
        _sum: {
            expense: true,
            income: true
        },
        orderBy: [{
            day: "asc"
        }]
    });

    // Get shared expenses for the month
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
                                gte: new Date(year, month, 1),
                                lte: new Date(year, month + 1, 0, 23, 59, 59)
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

    // Calculate shared expenses by day
    const sharedExpensesByDay: { [day: number]: number } = {};
    
    userGroups.forEach((groupMember: any) => {
        groupMember.group.expenses.forEach((expense: any) => {
            const userSplit = expense.splits.find((split: any) => split.userId === userId);
            if (userSplit) {
                const day = expense.date.getDate();
                sharedExpensesByDay[day] = (sharedExpensesByDay[day] || 0) + userSplit.amount;
            }
        });
    });

    if (!result || result.length === 0) return [];

    const history: HistoryData[] = [];
    const daysInMonth = getDaysInMonth(new Date(year, month));

    for (let i = 1; i <= daysInMonth; i++) {
        let expense = 0;
        let income = 0;

        const day = result.find(row => row.day === i);
        if (day) {
            expense = day._sum.expense || 0;
            income = day._sum.income || 0;
        }

        // Add shared expenses to the day
        const sharedExpenses = sharedExpensesByDay[i] || 0;
        expense += sharedExpenses;

        history.push({
            expense,
            income,
            year,
            month,
            day: i
        });
    }

    return history;
}