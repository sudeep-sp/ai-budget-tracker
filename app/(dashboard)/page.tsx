import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import Overview from "./_components/Overview";
import SpendingPredictionWrapper from "./_components/SpendingPredictionWrapper";
import History from "./_components/History";

async function page() {
  const user = await currentUser();
  if (!user) {
    // Redirect to sign-in page if user is not authenticated
    redirect("/sign-in");
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (!userSettings) {
    redirect("/wizard");
  }

  return (
    <div className="h-full bg-background pb-8 md:pb-12">
      <div className="border-b bg-card">
        <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 py-6 md:py-8 px-4 md:px-6 lg:px-8">
          <div>
            <p className="text-2xl md:text-3xl font-bold">
              Hello, {user.firstName}! 👋
            </p>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              Welcome to Budgetly
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <CreateTransactionDialog
              trigger={
                <Button
                  className="border-emerald-500 bg-emerald-950 text-white hover:bg-emerald-700 hover:text-white border text-sm flex-1 sm:flex-none"
                  size="sm"
                >
                  New income 🤑
                </Button>
              }
              type="income"
            />

            <CreateTransactionDialog
              trigger={
                <Button
                  className="border-rose-500 bg-rose-950 text-white hover:bg-rose-700 hover:text-white border text-sm flex-1 sm:flex-none"
                  size="sm"
                >
                  New expense 💸
                </Button>
              }
              type="expense"
            />
          </div>
        </div>
      </div>
      <Overview userSettings={userSettings} />
      <div className="container mx-auto px-4 mt-8 md:mt-12">
        <SpendingPredictionWrapper userSettings={userSettings} />
      </div>
      <History userSettings={userSettings} />
    </div>
  );
}

export default page;
