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
    <Card className="h-72 w-full overflow-hidden">
      <CardHeader className="pb-1 px-4 md:px-6 pt-2 md:pt-3">
        <CardTitle className="text-sm md:text-base text-muted-foreground">
          {type === "income" ? "Income" : "Expenses"} by category
        </CardTitle>
      </CardHeader>

      {filteredData.length === 0 ? (
        <div className="flex h-52 w-full flex-col items-center justify-center px-4">
          <p className="text-sm md:text-base text-center">
            No data for the selected period
          </p>
          <p className="text-xs md:text-sm text-muted-foreground text-center mt-2">
            Please try a different date range or try adding new{" "}
            {type === "income" ? "income" : "expenses"}
          </p>
        </div>
      ) : (
        <div className="h-52 w-full overflow-hidden px-4 pb-3">
          <ScrollArea className="h-full w-full">
            <div className="flex w-full flex-col gap-3 py-1 pr-2">
              {filteredData.map((item) => {
                const amount = item._sum.amount || 0;
                const percentage = total > 0 ? (amount * 100) / total : 0;

                return (
                  <div
                    key={item.category}
                    className="flex flex-col gap-2.5 w-full"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center text-gray-400 text-sm md:text-base min-w-0 flex-1 gap-2">
                        <span className="text-base md:text-lg shrink-0">
                          {item.categoryIcon}
                        </span>
                        <span className="truncate min-w-0 flex-1">
                          {item.category}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <span className="text-xs md:text-sm text-gray-400 shrink-0 text-right whitespace-nowrap ml-3">
                        {formatter.format(amount)}
                      </span>
                    </div>

                    <Progress
                      value={percentage}
                      className="h-2"
                      indicator={
                        type === "income" ? "bg-emerald-500" : "bg-red-500"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}
