import prisma from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schema/overview";
import { getUserSharedExpenses } from "@/lib/shared-utils";
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

    // Get individual stats
    const individualStats = await getUserBalanceStats(user.id, queryParams.data.from, queryParams.data.to);

    // Get shared expenses and add to individual expenses
    const sharedExpenses = await getUserSharedExpenses(user.id, queryParams.data.from, queryParams.data.to, prisma);

    return Response.json({
        income: individualStats.income,
        expense: individualStats.expense + sharedExpenses,
        sharedExpenses: sharedExpenses
    });

}

export type GetBalanceStatsResponseType = Awaited<ReturnType<typeof getUserBalanceStats>>;



async function getUserBalanceStats(userId: string, from: Date, to: Date) {
    // Fetch and return the user's balance data for the specified date range
    const totals = await prisma.transaction.groupBy({
        by: ["type"],
        where: {
            userId,
            date: {
                gte: from,
                lte: to
            }
        },
        _sum: {
            amount: true,
        }
    })

    return {
        expense: totals.find(t => t.type === "expense")?._sum.amount || 0,
        income: totals.find(t => t.type === "income")?._sum.amount || 0,
    }
}