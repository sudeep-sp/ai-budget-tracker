import { currentUser } from "@clerk/nextjs/server";

import { redirect } from "next/navigation";
import React from "react";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Logo from "@/components/Logo";
import { Currency, Target, Wallet } from "lucide-react";
import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import { BudgetInput } from "@/components/BudgetInput";
import { SavingsGoalInput } from "@/components/SavingsGoalInput";

async function page() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return (
    <div className="container flex max-w-2xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
      <div className="w-full space-y-4">
        <h1 className="text-center text-2xl sm:text-3xl leading-tight">
          Welcome, <span className="ml-2 font-bold">{user.firstName}! 👋</span>!
        </h1>
        <h2 className="text-center text-sm sm:text-base text-muted-foreground px-2">
          Let &apos;s get started by setting up your preferences.
        </h2>

        <h3 className="text-center text-xs sm:text-sm text-muted-foreground px-2">
          You can change these settings at any time
        </h3>
      </div>
      <Separator className="my-6" />
      <Card className="w-full mx-4 sm:mx-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Currency className="h-5 w-5" />
            Currency
          </CardTitle>
          <CardDescription className="text-sm">
            Set your default currency for transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <CurrencyComboBox />
        </CardContent>
      </Card>
      
      <Card className="w-full mx-4 sm:mx-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Wallet className="h-5 w-5" />
            Monthly Budget
          </CardTitle>
          <CardDescription className="text-sm">
            Set your monthly spending budget (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <BudgetInput />
        </CardContent>
      </Card>

      <Card className="w-full mx-4 sm:mx-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Target className="h-5 w-5" />
            Savings Goal
          </CardTitle>
          <CardDescription className="text-sm">
            Set your monthly savings goal (optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <SavingsGoalInput />
        </CardContent>
      </Card>
      <Separator className="my-6" />
      <Button className="w-full mx-4 sm:mx-0 h-12" asChild>
        <Link href={"/"}>I&apos;m done! Take me to the Dashboard</Link>
      </Button>
      <div className="mt-6 sm:mt-8">
        <Logo />
      </div>
    </div>
  );
}

export default page;
