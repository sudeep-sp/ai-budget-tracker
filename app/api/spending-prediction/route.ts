import prisma from "@/lib/prisma";
import { getUserSharedExpenses } from "@/lib/shared-utils";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import z from "zod/v3";

export const runtime = 'nodejs';

const getSpendingDataSchema = z.object({
    year: z.coerce.number().min(2000).max(3000),
    month: z.coerce.number().min(0).max(11)
});

export async function GET(request: Request) {
    const user = await currentUser();
    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    const queryParams = getSpendingDataSchema.safeParse({
        year,
        month,
    });

    if (!queryParams.success) {
        return Response.json(queryParams.error.message, { status: 400 });
    }

    const { year: selectedYear, month: selectedMonth } = queryParams.data;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    console.log(`API: Processing request for user ${user.id}, year ${selectedYear}, month ${selectedMonth}`);

    // Get user settings for monthly budget
    const userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
    });

    const monthlyBudget = userSettings?.monthlyBudget || 0;
    const dailyBudget = monthlyBudget / daysInMonth;

    console.log(`API: Monthly budget ${monthlyBudget}, daily budget ${dailyBudget}`);

    // Get daily data for the selected month
    const dailyData = [];
    let cumulativeActual = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        // Get individual expenses for this day
        const individualStats = await prisma.transaction.aggregate({
            where: {
                userId: user.id,
                type: "expense",
                date: {
                    gte: new Date(selectedYear, selectedMonth, day, 0, 0, 0),
                    lte: new Date(selectedYear, selectedMonth, day, 23, 59, 59)
                }
            },
            _sum: {
                amount: true,
            }
        });

        // Get shared expenses for this day
        const sharedExpenses = await getUserSharedExpenses(
            user.id,
            new Date(selectedYear, selectedMonth, day, 0, 0, 0),
            new Date(selectedYear, selectedMonth, day, 23, 59, 59),
            prisma
        );

        const dailyExpense = (individualStats._sum.amount || 0) + sharedExpenses;

        if (day === 1) {
            console.log(`API: Day 1 - Individual: ${individualStats._sum.amount || 0}, Shared: ${sharedExpenses}, Total: ${dailyExpense}`);
        }
        cumulativeActual += dailyExpense;

        // Calculate cumulative planned (linear progression)
        const cumulativePlanned = dailyBudget * day;

        dailyData.push({
            day: day,
            dailyExpense: dailyExpense,
            cumulativeActual: cumulativeActual,
            cumulativePlanned: cumulativePlanned
        });
    }

    return Response.json(dailyData);
}

export type GetSpendingPredictionResponseType = Awaited<{
    day: number;
    dailyExpense: number;
    cumulativeActual: number;
    cumulativePlanned: number;
}[]>;