"use server"

import prisma from "@/lib/prisma";
import { UpdateUserCurrencySchema, UpdateUserBudgetSchema, UpdateUserSavingsGoalSchema } from "@/schema/userSettings"
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function UpdateUserCurrency(currency: string) {
    const parsedBody = UpdateUserCurrencySchema.safeParse({ currency });

    if (!parsedBody.success) {
        throw parsedBody.error;
    }

    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const userSettings = await prisma.userSettings.update({
        where: { userId: user.id },
        data: { currency, }
    });

    return userSettings;
}

export async function UpdateUserBudget(monthlyBudget?: number) {
    const parsedBody = UpdateUserBudgetSchema.safeParse({ monthlyBudget });

    if (!parsedBody.success) {
        throw parsedBody.error;
    }

    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const userSettings = await prisma.userSettings.update({
        where: { userId: user.id },
        data: { monthlyBudget }
    });

    return userSettings;
}

export async function UpdateUserSavingsGoal(savingsGoal?: number) {
    const parsedBody = UpdateUserSavingsGoalSchema.safeParse({ savingsGoal });

    if (!parsedBody.success) {
        throw parsedBody.error;
    }

    const user = await currentUser();
    if (!user) {
        redirect("/sign-in");
    }

    const userSettings = await prisma.userSettings.update({
        where: { userId: user.id },
        data: { savingsGoal }
    });

    return userSettings;
}