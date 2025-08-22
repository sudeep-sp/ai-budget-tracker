"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
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
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { formatCurrency } from "@/lib/shared-utils";

interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  memberCount: number;
  expenseCount: number;
  totalExpenses: number;
  userRole: string;
  recentActivity: number;
  createdAt: string;
  updatedAt: string;
}

export default function SharedExpensesPage() {
  const groupsQuery = useQuery({
    queryKey: ["expense-groups"],
    queryFn: () => fetch("/api/groups").then((res) => res.json()),
  });

  const groups: GroupSummary[] = groupsQuery.data || [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Shared Expenses</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage shared budgets and split expenses with friends, family, or
              roommates
            </p>
          </div>
          <Link href="/shared/create">
            <Button size="sm" className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="sm:inline">Create Group</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
              <div>
                <p className="text-xs md:text-sm font-medium">Active Groups</p>
                <p className="text-lg md:text-2xl font-bold">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
              <div>
                <p className="text-xs md:text-sm font-medium">Total Expenses</p>
                <p className="text-sm md:text-2xl font-bold truncate">
                  {formatCurrency(
                    groups.reduce((sum, group) => sum + group.totalExpenses, 0)
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
                <p className="text-xs md:text-sm font-medium">
                  Total Transactions
                </p>
                <p className="text-lg md:text-2xl font-bold">
                  {groups.reduce((sum, group) => sum + group.expenseCount, 0)}
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
                <p className="text-xs md:text-sm font-medium">Active Members</p>
                <p className="text-lg md:text-2xl font-bold">
                  {groups.reduce((sum, group) => sum + group.memberCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-semibold">Your Groups</h2>

        <SkeletonWrapper isLoading={groupsQuery.isFetching}>
          {groups.length === 0 ? (
            <Card>
              <CardContent className="p-8 md:p-12 text-center">
                <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-base md:text-lg font-semibold mb-2">
                  No shared groups yet
                </h3>
                <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">
                  Create your first group to start splitting expenses with
                  others
                </p>
                <Link href="/shared/create">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Group
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </SkeletonWrapper>
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link href={`/shared/${group.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <CardTitle className="text-base md:text-lg truncate">
                {group.name}
              </CardTitle>
              {group.description && (
                <CardDescription className="text-xs md:text-sm truncate">
                  {group.description}
                </CardDescription>
              )}
            </div>
            <Badge
              variant={group.userRole === "owner" ? "default" : "secondary"}
              className="text-xs flex-shrink-0"
            >
              {group.userRole}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 md:space-y-4">
          <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
            <div>
              <p className="text-muted-foreground">Members</p>
              <p className="font-semibold text-sm md:text-base">
                {group.memberCount}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Expenses</p>
              <p className="font-semibold text-sm md:text-base">
                {group.expenseCount}
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs md:text-sm">
              Total Amount
            </p>
            <p className="text-base md:text-lg font-bold truncate">
              {formatCurrency(group.totalExpenses, group.currency)}
            </p>
          </div>

          {group.recentActivity > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {group.recentActivity} recent activity
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
