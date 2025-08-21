import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import Overview from "./_components/Overview";
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
    <div className="h-full bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-6 py-8 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-3xl font-bold">Hello, {user.firstName}! 👋</p>
            <p className="text-muted-foreground mt-2">
              Welcome to your budget tracker
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CreateTransactionDialog
              trigger={
                <Button className="border-emerald-500 bg-emerald-950 text-white hover:bg-emerald-700 hover:text-white border">
                  New income 🤑
                </Button>
              }
              type="income"
            />

            <CreateTransactionDialog
              trigger={
                <Button className="border-rose-500 bg-rose-950 text-white hover:bg-rose-700 hover:text-white border">
                  New expense 💸
                </Button>
              }
              type="expense"
            />
          </div>
        </div>
      </div>
      <Overview userSettings={userSettings} />
      <History userSettings={userSettings} />
    </div>
  );
}

export default page;
