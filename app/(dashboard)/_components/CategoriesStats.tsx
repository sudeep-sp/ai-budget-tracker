"use client";

import { GetCategoriesStatsResponseType } from "@/app/api/stats/categories/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserSettings } from "@/lib/generated/prisma";
import { DateToUTCD, GetFormatterForCurrency } from "@/lib/helpers";
import { TransactionType } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";

interface Props {
  userSettings: UserSettings;
  from: Date;
  to: Date;
}

function CategoriesStats({ userSettings, from, to }: Props) {
  const statsQuery = useQuery<GetCategoriesStatsResponseType>({
    queryKey: ["overview", "stats", "categories", from, to],
    queryFn: () =>
      fetch(
        `/api/stats/categories?from=${DateToUTCD(from)}&to=${DateToUTCD(to)}`
      ).then((res) => res.json()),
  });

  const formatter = useMemo(
    () => GetFormatterForCurrency(userSettings.currency),
    [userSettings.currency]
  );
  return (
    <div className="flex w-full flex-col lg:flex-row gap-4">
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <CategoriesCard
          formatter={formatter}
          type="income"
          data={statsQuery.data || []}
        />
      </SkeletonWrapper>
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <CategoriesCard
          formatter={formatter}
          type="expense"
          data={statsQuery.data || []}
        />
      </SkeletonWrapper>
    </div>
  );
}

export default CategoriesStats;

function CategoriesCard({
  formatter,
  type,
  data,
}: {
  type: TransactionType;
  formatter: Intl.NumberFormat;
  data: GetCategoriesStatsResponseType;
}) {
  const filteredData = data.filter((el) => el.type === type);
  const total = filteredData.reduce(
    (acc, cl) => acc + (cl._sum?.amount || 0),
    0
  );

  return (
    <Card className="h-80 w-full">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-sm md:text-base text-muted-foreground">
          {type === "income" ? "Income" : "Expenses"} by category
        </CardTitle>
      </CardHeader>
      <div className="flex items-center justify-between gap-2">
        {filteredData.length === 0 && (
          <div className="flex h-60 w-full flex-col items-center justify-center px-4">
            <p className="text-sm md:text-base text-center">
              No data for the selected period
            </p>
            <p className="text-xs md:text-sm text-muted-foreground text-center mt-2">
              Please try a different date range or try adding new{" "}
              {type === "income" ? "income" : "expenses"}
            </p>
          </div>
        )}

        {filteredData.length > 0 && (
          <ScrollArea className="h-60 w-full px-2 md:px-4">
            <div className="flex w-full flex-col gap-3 md:gap-4 p-2 md:p-4">
              {filteredData.map((item) => {
                const amount = item._sum.amount || 0;
                const percentage = (amount * 100) / (total || amount);

                return (
                  <div key={item.category} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-gray-400 text-sm md:text-base truncate flex-1 mr-2">
                        <span className="text-base md:text-lg mr-1">
                          {item.categoryIcon}
                        </span>
                        <span className="truncate">{item.category}</span>
                        <span className="ml-2 text-xs text-muted-foreground shrink-0">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </span>
                      <span className="text-xs md:text-sm text-gray-400 shrink-0">
                        {formatter.format(amount)}
                      </span>
                    </div>

                    <Progress
                      value={percentage}
                      indicator={
                        type === "income" ? "bg-emerald-500" : "bg-red-500"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
