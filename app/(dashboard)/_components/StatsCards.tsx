"use client";

import { GetBalanceStatsResponseType } from "@/app/api/stats/balance/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { UserSettings } from "@/lib/generated/prisma";
import { DateToUTCD, GetFormatterForCurrency } from "@/lib/helpers";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import React, { useCallback, useMemo } from "react";
import Countup from "react-countup";

interface Props {
  from: Date;
  to: Date;
  userSettings: UserSettings;
}

function StatsCards({ from, to, userSettings }: Props) {
  const statsQuery = useQuery<GetBalanceStatsResponseType>({
    queryKey: ["overview", "stats", from, to],
    queryFn: () =>
      fetch(
        `/api/stats/balance?from=${DateToUTCD(from)}&to=${DateToUTCD(to)}`
      ).then((res) => res.json()),
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const income = statsQuery.data?.income || 0;
  const expense = statsQuery.data?.expense || 0;

  const balance = income - expense;

  return (
    <div className="relative flex w-full flex-wrap gap-2 md:flex-nowrap">
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <StatsCard
          formatter={formatter}
          value={income}
          title="Income"
          icon={
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
          }
        />
      </SkeletonWrapper>
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <StatsCard
          formatter={formatter}
          value={expense}
          title="Expense"
          icon={
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-400/10">
              <TrendingDown className="h-6 w-6 text-red-500" />
            </div>
          }
        />
      </SkeletonWrapper>
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <StatsCard
          formatter={formatter}
          value={balance}
          title="Balance"
          icon={
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-400/10">
              <Wallet className="h-6 w-6 text-violet-500" />
            </div>
          }
        />
      </SkeletonWrapper>
    </div>
  );
}

export default StatsCards;

function StatsCard({
  formatter,
  value,
  title,
  icon,
}: {
  formatter: Intl.NumberFormat;
  value: number;
  title: string;
  icon: React.ReactNode;
}) {
  const formatfn = useCallback(
    (value: number) => {
      return formatter.format(value);
    },
    [formatter]
  );

  return (
    <Card className="flex h-24 w-full flex-row items-center p-4">
      <div className="mr-4">{icon}</div>
      <div className="flex flex-col justify-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Countup
          preserveValue
          redraw={false}
          end={value}
          decimals={2}
          formattingFn={formatfn}
          className="text-xl font-semibold"
        />
      </div>
    </Card>
  );
}
