"use client";

import React from "react";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Users,
  DollarSign,
  Receipt,
  Settings,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  TrashIcon,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import DeleteSharedExpenseDialog from "../_components/DeleteSharedExpenseDialog";
import QuickSettleButton from "../_components/QuickSettleButton";
import SettlementSuggestions from "../_components/SettlementSuggestions";
import ExpenseDetailsSheet from "../_components/ExpenseDetailsSheet";
import SendReminderButton from "../_components/SendReminderButton";
import GroupSummaryWidget from "../_components/GroupSummaryWidget";
import { formatCurrency } from "@/lib/shared-utils";

interface GroupPageProps {
  params: Promise<{ groupId: string }>;
}

export default function GroupPage({ params }: GroupPageProps) {
  const { groupId } = use(params);

  const groupQuery = useQuery({
    queryKey: ["expense-group", groupId],
    queryFn: () => fetch(`/api/groups/${groupId}`).then((res) => res.json()),
  });

  const balancesQuery = useQuery({
    queryKey: ["group-balances", groupId],
    queryFn: () =>
      fetch(`/api/groups/${groupId}/balances`).then((res) => res.json()),
  });

  const group = groupQuery.data;
  const balances = balancesQuery.data;

  // Find current user's balance from the individual balances array
  const currentUserBalance = balances?.balances?.find(
    (b: any) => b.userId === balances?.userBalance?.userId
  );

  if (groupQuery.isError || balancesQuery.isError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Failed to load group data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-7xl min-h-screen">
      <SkeletonWrapper isLoading={groupQuery.isFetching}>
        {group && (
          <>
            {/* Header */}
            <div className="space-y-3 lg:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <Link href="/shared">
                  <Button variant="outline" size="sm" className="w-fit">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-start">
                  <Link
                    href={`/shared/${groupId}/add-expense`}
                    className="flex-1 sm:flex-initial"
                  >
                    <Button size="sm" className="gap-2 w-full sm:w-auto">
                      <Plus className="h-4 w-4" />
                      <span className="sm:hidden">Add</span>
                      <span className="hidden sm:inline">Add Expense</span>
                    </Button>
                  </Link>
                  <Link href={`/shared/${groupId}/manage`}>
                    <Button variant="outline" size="sm" className="px-3">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Settings</span>
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
                    {group.name}
                  </h1>
                  <Badge variant="outline" className="w-fit">
                    {group.members?.find(
                      (m: any) => m.userId === group.members[0]?.userId
                    )?.role || "member"}
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-muted-foreground text-sm lg:text-base line-clamp-2">
                    {group.description}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <Users className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm font-medium text-muted-foreground">
                        Members
                      </p>
                      <p className="text-lg lg:text-2xl font-bold truncate">
                        {group._count?.members || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <Receipt className="h-4 w-4 lg:h-5 lg:w-5 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm font-medium text-muted-foreground">
                        Total Expenses
                      </p>
                      <p className="text-sm lg:text-2xl font-bold truncate">
                        {formatCurrency(
                          group.expenses?.reduce(
                            (sum: number, expense: any) => sum + expense.amount,
                            0
                          ) || 0,
                          group.currency
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-red-500 hover:shadow-sm transition-shadow">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm font-medium text-red-700">
                        You Owe
                      </p>
                      <p className="text-sm lg:text-2xl font-bold text-red-600 truncate">
                        {currentUserBalance
                          ? formatCurrency(
                              currentUserBalance.totalOwed,
                              group.currency
                            )
                          : "€0.00"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500 hover:shadow-sm transition-shadow">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm font-medium text-green-700">
                        You&apos;re Owed
                      </p>
                      <p className="text-sm lg:text-2xl font-bold text-green-600 truncate">
                        {currentUserBalance
                          ? formatCurrency(
                              currentUserBalance.totalOwing,
                              group.currency
                            )
                          : "€0.00"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-4 lg:space-y-6">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                <TabsTrigger
                  value="overview"
                  className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  <span className="sm:hidden">Info</span>
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="expenses"
                  className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Expenses
                </TabsTrigger>
                <TabsTrigger
                  value="balances"
                  className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Balances
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Members
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 lg:space-y-6">
                <GroupSummaryWidget
                  group={group}
                  balances={balances}
                  expenses={group.expenses || []}
                />
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4 lg:space-y-6">
                <ExpensesList
                  expenses={group.expenses || []}
                  members={group.members || []}
                  currency={group.currency}
                  groupId={groupId}
                />
              </TabsContent>

              <TabsContent value="balances" className="space-y-4 lg:space-y-6">
                <BalancesList balances={balances} currency={group.currency} />
              </TabsContent>

              <TabsContent value="members" className="space-y-4 lg:space-y-6">
                <MembersList
                  members={group.members || []}
                  groupId={groupId}
                  groupName={group.name}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SkeletonWrapper>
    </div>
  );
}

function ExpensesList({
  expenses,
  members,
  currency,
  groupId,
}: {
  expenses: any[];
  members: any[];
  currency: string;
  groupId: string;
}) {
  const memberMap = new Map(members.map((m) => [m.userId, m.name]));

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
          <Receipt className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">
            No expenses yet
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-md mx-auto">
            Add your first shared expense to get started
          </p>
          <Link href={`/shared/${groupId}/add-expense`}>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add First Expense
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall payment statistics - only Paid and Pending
  const totalExpenses = expenses.length;
  const paidExpenses = expenses.filter((expense) =>
    expense.splits?.every((split: any) => split.isPaid)
  ).length;
  const pendingExpenses = totalExpenses - paidExpenses;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Summary Stats */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 text-center">
            <div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {paidExpenses}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">Paid</p>
            </div>
            <div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                {pendingExpenses}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Pending
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-3 lg:space-y-4">
        {expenses.slice(0, 10).map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            memberMap={memberMap}
            currency={currency}
            groupId={groupId}
          />
        ))}

        {expenses.length > 10 && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Showing 10 of {expenses.length} expenses
              </p>
              <Button variant="outline" size="sm">
                Load More
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ExpenseCard({
  expense,
  memberMap,
  currency,
  groupId,
}: {
  expense: any;
  memberMap: Map<string, string>;
  currency: string;
  groupId: string;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  // Calculate payment progress
  const totalAmount = expense.amount;
  const paidAmount =
    expense.splits?.reduce((sum: number, split: any) => {
      return split.isPaid ? sum + split.amount : sum;
    }, 0) || 0;
  const paymentProgress =
    totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Determine payment status color
  const getPaymentStatusColor = () => {
    if (paymentProgress === 100) return "text-green-600";
    if (paymentProgress > 0) return "text-orange-600";
    return "text-red-600";
  };

  const getPaymentStatusBadge = () => {
    if (paymentProgress === 100)
      return { text: "Paid", color: "bg-green-100 text-green-800" };
    if (paymentProgress > 0)
      return { text: "Partial", color: "bg-orange-100 text-orange-800" };
    return { text: "Unpaid", color: "bg-red-100 text-red-800" };
  };

  const statusBadge = getPaymentStatusBadge();

  return (
    <>
      <DeleteSharedExpenseDialog
        open={showDeleteDialog}
        setOpen={setShowDeleteDialog}
        expenseId={expense.id}
        groupId={groupId}
      />
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl">
                  {expense.categoryIcon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm md:text-base truncate">
                      {expense.description}
                    </h4>
                    <Badge className={`text-xs ${statusBadge.color}`}>
                      {statusBadge.text}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Split between {expense.splits?.length || 0} people
                    </Badge>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Paid by {memberMap.get(expense.paidBy) || "Unknown"} •{" "}
                    {expense.category}
                  </p>
                  {/* Payment Progress Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">
                        Progress: {formatCurrency(paidAmount, currency)} /{" "}
                        {formatCurrency(totalAmount, currency)}
                      </span>
                      <span className="text-xs font-medium">
                        {Math.round(paymentProgress)}%
                      </span>
                    </div>
                    <Progress value={paymentProgress} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p
                  className={`font-bold text-sm md:text-base ${getPaymentStatusColor()}`}
                >
                  {formatCurrency(expense.amount, currency)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {new Date(expense.date).toLocaleDateString()}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-red-600"
                    onSelect={() => setShowDeleteDialog(true)}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete Expense
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {expense.splits && expense.splits.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-3">
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <SendReminderButton
                  expense={expense}
                  memberMap={memberMap}
                  currency={currency}
                  groupId={groupId}
                />
                <ExpenseDetailsSheet
                  expense={expense}
                  memberMap={memberMap}
                  currency={currency}
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <Receipt className="h-4 w-4" />
                    <span className="hidden sm:inline">Details</span>
                  </Button>
                </ExpenseDetailsSheet>
              </div>

              {/* Split Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs md:text-sm">
                {expense.splits.slice(0, 6).map((split: any) => (
                  <div
                    key={split.id}
                    className="flex justify-between items-center py-1"
                  >
                    <span className="truncate font-medium">
                      {memberMap.get(split.userId) || "Unknown"}
                    </span>
                    <div className="flex items-center gap-1">
                      <QuickSettleButton
                        splitId={split.id}
                        amount={split.amount}
                        currency={currency}
                        isPaid={split.isPaid}
                        groupId={groupId}
                        memberName={memberMap.get(split.userId) || "Unknown"}
                      />
                    </div>
                  </div>
                ))}
                {expense.splits.length > 6 && (
                  <div className="col-span-full text-center">
                    <Badge variant="outline" className="text-xs">
                      +{expense.splits.length - 6} more
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function BalancesList({
  balances,
  currency,
}: {
  balances: any;
  currency: string;
}) {
  if (!balances?.balances || balances.balances.length === 0) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <Card>
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              No balances to show
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              Add some expenses to see balance information
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate summary statistics - use current user's individual balance
  const currentUserBalanceData = balances.balances?.find(
    (b: any) => b.userId === balances?.userBalance?.userId
  );

  const totalOwed = currentUserBalanceData?.totalOwed || 0;
  const totalOwing = currentUserBalanceData?.totalOwing || 0;

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Settlement Suggestions */}
      {balances.settlements && (
        <SettlementSuggestions
          settlements={balances.settlements}
          currency={currency}
          groupId={balances.groupId || ""}
        />
      )}

      {/* Individual Balances */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg lg:text-xl">
            Individual Balances
          </CardTitle>
          <CardDescription className="text-sm">
            Detailed breakdown of what each member owes or is owed
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {balances.balances.map((balance: any) => {
              // Calculate correct net balance: positive means they owe you, negative means you owe them
              const correctNetBalance = balance.totalOwing - balance.totalOwed;

              return (
                <Card
                  key={balance.userId}
                  className="border hover:shadow-sm transition-shadow"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                            {balance.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate text-sm sm:text-base">
                              {balance.name}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {balance.email}
                            </p>
                          </div>
                        </div>

                        {/* Balance Details */}
                        <div className="space-y-1.5 sm:space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Owes:</span>
                            <span className="text-red-600 font-medium">
                              {formatCurrency(balance.totalOwed, currency)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Owed:</span>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(balance.totalOwing, currency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="mb-2 sm:mb-3">
                          <p
                            className={`font-bold text-base sm:text-lg lg:text-xl ${
                              correctNetBalance > 0
                                ? "text-green-600"
                                : correctNetBalance < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }`}
                          >
                            {correctNetBalance > 0 && "+"}
                            {formatCurrency(correctNetBalance, currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {correctNetBalance > 0
                              ? "owes you"
                              : correctNetBalance < 0
                              ? "you owe"
                              : "settled up"}
                          </p>
                        </div>

                        {correctNetBalance !== 0 && (
                          <Badge
                            variant={
                              correctNetBalance > 0 ? "default" : "secondary"
                            }
                            className={`text-xs ${
                              correctNetBalance > 0
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }`}
                          >
                            {correctNetBalance > 0 ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            <span className="hidden sm:inline">Net </span>
                            {correctNetBalance > 0 ? "Credit" : "Debt"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Transaction Count */}
                    {balance.transactions &&
                      balance.transactions.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {balance.transactions.length} transaction(s)
                            </span>
                            <span>
                              {
                                balance.transactions.filter(
                                  (t: any) => !t.isPaid
                                ).length
                              }{" "}
                              unpaid
                            </span>
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MembersList({
  members,
  groupId,
  groupName,
}: {
  members: any[];
  groupId: string;
  groupName?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-lg font-semibold">
          Group Members ({members.length})
        </h3>
        <InviteMemberDialog groupId={groupId} groupName={groupName} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold truncate">{member.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                <Badge
                  variant={member.role === "owner" ? "default" : "secondary"}
                  className="flex-shrink-0"
                >
                  {member.role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
