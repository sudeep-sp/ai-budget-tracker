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
import SkeletonWrapper from "@/components/SkeletonWrapper";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import DeleteSharedExpenseDialog from "../_components/DeleteSharedExpenseDialog";
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
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <SkeletonWrapper isLoading={groupQuery.isFetching}>
        {group && (
          <>
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Link href="/shared">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/shared/${groupId}/add-expense`}>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Expense</span>
                    </Button>
                  </Link>
                  <Link href={`/shared/${groupId}/manage`}>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {group.name}
                  </h1>
                  <Badge variant="outline">
                    {group.members?.find(
                      (m: any) => m.userId === group.members[0]?.userId
                    )?.role || "member"}
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {group.description}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
                    <div>
                      <p className="text-xs md:text-sm font-medium">Members</p>
                      <p className="text-lg md:text-2xl font-bold">
                        {group._count?.members || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                    <div>
                      <p className="text-xs md:text-sm font-medium">
                        Total Expenses
                      </p>
                      <p className="text-sm md:text-2xl font-bold truncate">
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

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
                    <div>
                      <p className="text-xs md:text-sm font-medium">You Owe</p>
                      <p className="text-sm md:text-2xl font-bold text-red-500 truncate">
                        {balances?.userBalance
                          ? formatCurrency(
                              Math.max(0, -balances.userBalance.netBalance),
                              group.currency
                            )
                          : "Loading..."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                    <div>
                      <p className="text-xs md:text-sm font-medium">
                        You&apos;re Owed
                      </p>
                      <p className="text-sm md:text-2xl font-bold text-green-500 truncate">
                        {balances?.userBalance
                          ? formatCurrency(
                              Math.max(0, balances.userBalance.netBalance),
                              group.currency
                            )
                          : "Loading..."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="expenses" className="space-y-4 md:space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="expenses" className="text-xs sm:text-sm">
                  Recent Expenses
                </TabsTrigger>
                <TabsTrigger value="balances" className="text-xs sm:text-sm">
                  Balances
                </TabsTrigger>
                <TabsTrigger value="members" className="text-xs sm:text-sm">
                  Members
                </TabsTrigger>
              </TabsList>

              <TabsContent value="expenses" className="space-y-4">
                <ExpensesList
                  expenses={group.expenses || []}
                  members={group.members || []}
                  currency={group.currency}
                  groupId={groupId}
                />
              </TabsContent>

              <TabsContent value="balances" className="space-y-4">
                <BalancesList balances={balances} currency={group.currency} />
              </TabsContent>

              <TabsContent value="members" className="space-y-4">
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
        <CardContent className="p-12 text-center">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
          <p className="text-muted-foreground">
            Add your first shared expense to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.slice(0, 10).map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          memberMap={memberMap}
          currency={currency}
          groupId={groupId}
        />
      ))}
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
                  <h4 className="font-semibold text-sm md:text-base truncate">
                    {expense.description}
                  </h4>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Paid by {memberMap.get(expense.paidBy) || "Unknown"} •{" "}
                    {expense.category}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="font-bold text-sm md:text-base">
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
                  <DropdownMenuLabel>Action</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-red-600"
                    onSelect={() => setShowDeleteDialog(true)}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {expense.splits && expense.splits.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs md:text-sm">
                {expense.splits.slice(0, 6).map((split: any) => (
                  <div key={split.id} className="flex justify-between">
                    <span className="truncate">
                      {memberMap.get(split.userId) || "Unknown"}
                    </span>
                    <span
                      className={
                        split.isPaid ? "text-green-600" : "text-orange-600"
                      }
                    >
                      {formatCurrency(split.amount, currency)}
                      {split.isPaid ? " ✓" : " ⏳"}
                    </span>
                  </div>
                ))}
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
      <Card>
        <CardContent className="p-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No balances to show</h3>
          <p className="text-muted-foreground">
            Add some expenses to see balance information
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {balances.balances.map((balance: any) => (
        <Card key={balance.userId}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold truncate">{balance.name}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {balance.email}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={`font-bold text-sm md:text-base ${
                    balance.netBalance > 0
                      ? "text-green-600"
                      : balance.netBalance < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {balance.netBalance > 0 && "+"}
                  {formatCurrency(balance.netBalance, currency)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {balance.netBalance > 0
                    ? "owes you"
                    : balance.netBalance < 0
                    ? "you owe"
                    : "settled up"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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
