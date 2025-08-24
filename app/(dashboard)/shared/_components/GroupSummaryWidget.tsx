"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/shared-utils";

interface GroupSummaryWidgetProps {
  group: any;
  balances: any;
  expenses: any[];
}

export default function GroupSummaryWidget({
  group,
  balances,
  expenses,
}: GroupSummaryWidgetProps) {
  // Calculate metrics
  const totalExpenseAmount = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const totalSplits = expenses.reduce(
    (sum, expense) => sum + (expense.splits?.length || 0),
    0
  );
  const paidSplits = expenses.reduce(
    (sum, expense) =>
      sum + (expense.splits?.filter((split: any) => split.isPaid).length || 0),
    0
  );
  const paymentProgress =
    totalSplits > 0 ? (paidSplits / totalSplits) * 100 : 0;

  const fullyPaidExpenses = expenses.filter((expense) =>
    expense.splits?.every((split: any) => split.isPaid)
  ).length;

  const unpaidExpenses = expenses.filter((expense) =>
    expense.splits?.some((split: any) => !split.isPaid)
  ).length;

  // Recent activity (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentExpenses = expenses.filter(
    (expense) => new Date(expense.date) >= oneWeekAgo
  ).length;

  // User balance summary - use individual balance data (not netBalance which is incorrect)
  const currentUserBalance = balances?.balances?.find(
    (b: any) => b.userId === balances?.userBalance?.userId
  );

  const actualNetBalance = currentUserBalance
    ? currentUserBalance.totalOwing - currentUserBalance.totalOwed
    : 0;

  const userOwes = Math.max(0, -actualNetBalance);
  const userOwed = Math.max(0, actualNetBalance);
  const isSettledUp = Math.abs(actualNetBalance) < 0.01;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Payment Progress Card */}
      <Card className="col-span-full md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">
                {Math.round(paymentProgress)}% Complete
              </span>
            </div>
            <Progress value={paymentProgress} className="h-3" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-lg font-bold text-green-600">
                  {paidSplits}
                </div>
                <div className="text-xs text-muted-foreground">Paid</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-orange-600">
                  {totalSplits - paidSplits}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold">{totalSplits}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Balance */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {isSettledUp ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : userOwed > 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className="text-xs font-medium">Your Balance</p>
              {isSettledUp ? (
                <p className="text-lg font-bold text-green-600">Settled Up!</p>
              ) : (
                <p
                  className={`text-lg font-bold ${
                    userOwed > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {userOwed > 0
                    ? `+${formatCurrency(userOwed, group.currency)}`
                    : `-${formatCurrency(userOwes, group.currency)}`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs font-medium">Expenses Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-green-600">
                  {fullyPaidExpenses}
                </span>
                <span className="text-xs text-muted-foreground">paid</span>
                <span className="text-sm font-bold text-orange-600">
                  {unpaidExpenses}
                </span>
                <span className="text-xs text-muted-foreground">pending</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-xs font-medium">Recent Activity</p>
              <p className="text-lg font-bold">{recentExpenses}</p>
              <p className="text-xs text-muted-foreground">
                expense{recentExpenses !== 1 ? "s" : ""} this week
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="col-span-full">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium">Members</span>
              </div>
              <div className="text-xl font-bold">
                {group._count?.members || 0}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium">Total Spent</span>
              </div>
              <div className="text-xl font-bold">
                {formatCurrency(totalExpenseAmount, group.currency)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium">Settled</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                {fullyPaidExpenses}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium">Pending</span>
              </div>
              <div className="text-xl font-bold text-orange-600">
                {unpaidExpenses}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
