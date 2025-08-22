"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSettings } from "@/lib/generated/prisma";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { Period, Timeframe } from "@/lib/types";
import React, { useCallback, useMemo } from "react";
import HistoryPeriodSelector from "./HistoryPeriodSelector";
import { useQuery } from "@tanstack/react-query";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";
import CountUp from "react-countup";

function History({ userSettings }: { userSettings: UserSettings }) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>("month");
  const [period, setPeriod] = React.useState<Period>({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const historyDataQuery = useQuery({
    queryKey: ["overview", "history", timeframe, period],
    queryFn: () =>
      fetch(
        `/api/history-data?timeframe=${timeframe}&year=${period.year}&month=${period.month}`
      ).then((res) => res.json()),
  });

  const dataAvailable =
    historyDataQuery.data && historyDataQuery.data.length > 0;

  return (
    <div className="container mx-auto px-4">
      <h2 className="mt-8 md:mt-12 text-2xl md:text-3xl font-bold">History</h2>
      <Card className="col-span-12 mt-2 w-full">
        <CardHeader className="gap-2 p-4 md:p-6">
          <CardTitle className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
            <HistoryPeriodSelector
              period={period}
              setPeriod={setPeriod}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
            />

            <div className="flex h-10 gap-2 flex-wrap">
              <Badge
                variant={"outline"}
                className="flex items-center gap-2 text-xs md:text-sm"
              >
                <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-emerald-500"></div>
                income
              </Badge>
              <Badge
                variant={"outline"}
                className="flex items-center gap-2 text-xs md:text-sm"
              >
                <div className="h-3 w-3 md:h-4 md:w-4 rounded-full bg-red-500"></div>
                expense
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <SkeletonWrapper isLoading={historyDataQuery.isFetching}>
            {dataAvailable && (
              <ResponsiveContainer width={"100%"} height={300}>
                <BarChart
                  height={300}
                  data={historyDataQuery.data}
                  barCategoryGap={5}
                >
                  <defs>
                    <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={"0"} stopColor="#10b981" stopOpacity={1} />
                      <stop
                        offset={"100"}
                        stopColor="#10b981"
                        stopOpacity={0}
                      />
                    </linearGradient>

                    <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={"0"} stopColor="#ef4444" stopOpacity={1} />
                      <stop
                        offset={"100"}
                        stopColor="#ef4444"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="5 5"
                    stopOpacity={"0.2"}
                    vertical={false}
                  />
                  <XAxis
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    padding={{ left: 5, right: 5 }}
                    dataKey={(data) => {
                      const { year, month, day } = data;
                      const date = new Date(year, month, day || 1);
                      if (timeframe === "year") {
                        return date.toLocaleDateString("default", {
                          month: "short",
                        });
                      }
                      return date.toLocaleDateString("default", {
                        day: "2-digit",
                      });
                    }}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Bar
                    dataKey={"income"}
                    fill="url(#income)"
                    label="Income"
                    radius={4}
                    className="cursor-pointer"
                  />
                  <Bar
                    dataKey={"expense"}
                    fill="url(#expense)"
                    label="Expense"
                    radius={4}
                    className="cursor-pointer"
                  />
                  <Tooltip
                    cursor={{ opacity: 0.1 }}
                    content={(props) => (
                      <CustomTooltip formatter={formatter} {...props} />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            {!dataAvailable && (
              <Card className="flex h-[300px] flex-col items-center justify-center bg-background">
                <p className="text-sm md:text-base">
                  No data for the selected period
                </p>
                <p className="text-xs md:text-sm text-muted-foreground text-center mt-2">
                  Try adjusting the filters or adding new data.
                </p>
              </Card>
            )}
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </div>
  );
}

export default History;

function CustomTooltip({ active, payload, formatter }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const { expense, income } = data;
  const balance = income - expense;

  return (
    <div className="min-w-[200px] md:min-w-[300px] rounded border bg-background p-3 md:p-4">
      <TooltipRow
        formatter={formatter}
        label="Income"
        value={income}
        bgColor="bg-emerald-500"
        textColor="text-emerald-500"
      />
      <TooltipRow
        formatter={formatter}
        label="Expense"
        value={expense}
        bgColor="bg-red-500"
        textColor="text-red-500"
      />
      <TooltipRow
        formatter={formatter}
        label="Balance"
        value={balance}
        bgColor="bg-blue-500"
        textColor="text-blue-500"
      />
    </div>
  );
}

function TooltipRow({
  label,
  value,
  bgColor,
  textColor,
  formatter,
}: {
  label: string;
  value: number;
  bgColor: string;
  textColor: string;
  formatter: Intl.NumberFormat;
}) {
  const formattingFn = useCallback(
    (value: number) => {
      return formatter.format(value);
    },
    [formatter]
  );
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-3 w-3 md:h-4 md:w-4 rounded-full", bgColor)} />
      <div className="flex w-full justify-between items-center">
        <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
        <div className={cn("text-xs md:text-sm font-bold", textColor)}>
          <CountUp
            duration={0.5}
            preserveValue
            end={value}
            decimals={0}
            formattingFn={formattingFn}
            className="text-xs md:text-sm"
          />
        </div>
      </div>
    </div>
  );
}
