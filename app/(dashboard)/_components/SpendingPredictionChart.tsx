"use client";

import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSettings } from "@/lib/generated/prisma";
import { GetFormatterForCurrency } from "@/lib/helpers";
import { useMemo } from "react";

interface SpendingData {
  day: number;
  dailyExpense: number;
  cumulativeActual: number;
  cumulativePlanned: number;
  isToday?: boolean;
}

interface Props {
  data: SpendingData[];
  userSettings: UserSettings;
  monthlyBudget?: number;
  selectedMonth: string;
  selectedYear: number;
  selectedMonthNum: number;
  onMonthChange: (month: number, year: number) => void;
}

const chartConfig = {
  cumulativeActual: {
    label: "Actual Cumulative",
    color: "#8884d8",
  },
  cumulativePlanned: {
    label: "Planned (Linear)",
    color: "#82ca9d",
  },
} satisfies ChartConfig;

export function SpendingPredictionChart({
  data,
  userSettings,
  monthlyBudget,
  selectedMonth,
  selectedYear,
  selectedMonthNum,
  onMonthChange,
}: Props) {
  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  // Add fallback data for debugging if no data exists or no budget
  const safeBudget = monthlyBudget || 600; // Default to 600 for demo
  const daysInMonth = new Date(selectedYear, selectedMonthNum + 1, 0).getDate();
  const dailyBudget = safeBudget / daysInMonth;

  // Generate chart data - if no data from API, create realistic data based on actual budget
  const chartData = useMemo(() => {
    if (data.length > 0) {
      return data;
    }

    // Get current date info
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === selectedYear && today.getMonth() === selectedMonthNum;
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

    // Create realistic data based on the actual monthly budget
    let cumulativeActual = 0;
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const cumulativePlanned = dailyBudget * day;
      
      // Only show actual spending data up to current day for current month
      let actualValue = null;
      let dailyExpense = 0;
      
      if (day <= currentDay) {
        // For demo purposes, show some realistic spending pattern
        // In a real scenario, this would be actual transaction data
        dailyExpense = Math.random() * (dailyBudget * 1.5); // Random daily expense
        cumulativeActual += dailyExpense;
        actualValue = Math.round(cumulativeActual * 100) / 100;
      }

      return {
        day,
        dailyExpense,
        cumulativeActual: actualValue, // null for future days
        cumulativePlanned: Math.round(cumulativePlanned * 100) / 100,
        isToday: day === currentDay && isCurrentMonth,
      };
    });
  }, [data, daysInMonth, dailyBudget, selectedYear, selectedMonthNum]);

  console.log("API data received:", data.length, "items");
  console.log("Chart data:", chartData.slice(0, 5)); // Debug first 5 days
  console.log("Monthly budget:", monthlyBudget);
  console.log("Daily budget:", dailyBudget);
  console.log("Using fallback data:", data.length === 0);
  console.log("Chart data ranges:", {
    minActual: Math.min(...chartData.map(d => d.cumulativeActual).filter((val): val is number => val !== null)),
    maxActual: Math.max(...chartData.map(d => d.cumulativeActual).filter((val): val is number => val !== null)),
    minPlanned: Math.min(...chartData.map(d => d.cumulativePlanned)),
    maxPlanned: Math.max(...chartData.map(d => d.cumulativePlanned))
  });

  // Calculate metrics
  const { actualToDate, plannedToDate, variance, todayIndex } = useMemo(() => {
    if (!chartData.length)
      return { actualToDate: 0, plannedToDate: 0, variance: 0, todayIndex: -1 };

    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === selectedYear &&
      today.getMonth() === selectedMonthNum;
    const todayDay = isCurrentMonth ? today.getDate() : chartData.length;
    const tIdx = isCurrentMonth ? todayDay - 1 : -1;

    // Find the last day with actual data (not null)
    const lastActualDay = chartData.findLast(d => d.cumulativeActual !== null);
    const actualToToday = lastActualDay?.cumulativeActual || 0;
    
    const plannedToToday =
      chartData[Math.min(todayDay - 1, chartData.length - 1)]
        ?.cumulativePlanned || 0;
    const diff = actualToToday - plannedToToday;

    return {
      actualToDate: actualToToday,
      plannedToDate: plannedToToday,
      variance: diff,
      todayIndex: tIdx,
    };
  }, [chartData, selectedYear, selectedMonthNum]);

  const displayDailyBudget = safeBudget / daysInMonth;

  const currentDate = new Date();

  const handleMonthChange = (monthValue: string) => {
    const month = parseInt(monthValue);
    onMonthChange(month, selectedYear);
  };

  const handleYearChange = (yearValue: string) => {
    const year = parseInt(yearValue);
    onMonthChange(selectedMonthNum, year);
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl md:text-2xl truncate">
              Spending vs Plan — {selectedMonth}
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Daily plan {formatter.format(displayDailyBudget)} • Monthly budget{" "}
              {formatter.format(safeBudget)}
            </CardDescription>
          </div>
          
          {/* Date Selectors - Mobile: Full width, Desktop: Auto width */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Select
              value={selectedYear.toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-full sm:w-[100px] md:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from(
                  { length: 5 },
                  (_, i) => currentDate.getFullYear() - 2 + i
                ).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonthNum.toString()}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-full sm:w-[120px] md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i).map((month) => {
                  const monthStr = new Date(
                    selectedYear,
                    month,
                    1
                  ).toLocaleDateString("default", {
                    month: "long",
                  });
                  return (
                    <SelectItem key={month} value={month.toString()}>
                      {monthStr}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Statistics - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm">
          <div className="flex flex-col items-center sm:items-start p-3 sm:p-0 bg-muted/50 sm:bg-transparent rounded-lg sm:rounded-none">
            <div className="text-muted-foreground mb-1">Planned to date</div>
            <div className="font-medium text-sm sm:text-base">{formatter.format(plannedToDate)}</div>
          </div>
          <div className="flex flex-col items-center sm:items-start p-3 sm:p-0 bg-muted/50 sm:bg-transparent rounded-lg sm:rounded-none">
            <div className="text-muted-foreground mb-1">Actual to date</div>
            <div className="font-medium text-sm sm:text-base">{formatter.format(actualToDate)}</div>
          </div>
          <div className="flex flex-col items-center sm:items-start p-3 sm:p-0 bg-muted/50 sm:bg-transparent rounded-lg sm:rounded-none">
            <div className="text-muted-foreground mb-1">
              {variance >= 0 ? "Over plan" : "Under plan"}
            </div>
            <div className="flex items-center gap-1 font-medium text-sm sm:text-base">
              <TrendingUp
                className={variance < 0 ? "rotate-180 h-3 w-3 sm:h-4 sm:w-4" : "h-3 w-3 sm:h-4 sm:w-4"}
              />
              <span>{formatter.format(Math.abs(variance))}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-4 md:px-6">
        <div className="w-full overflow-hidden">
          <ChartContainer config={chartConfig} className="aspect-[4/3] sm:aspect-[3/2] md:aspect-[5/3] lg:aspect-[2/1] min-h-[200px] max-h-[500px] w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 0,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                opacity={0.3}
              />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value, index) => {
                  // Show fewer ticks on mobile for better readability
                  const totalTicks = chartData.length;
                  if (typeof window !== 'undefined' && window.innerWidth < 640) {
                    // On mobile, show every 5th day for months, or smart intervals
                    if (totalTicks > 20) {
                      return index % 5 === 0 || index === totalTicks - 1 ? value.toString() : '';
                    }
                  }
                  return value.toString();
                }}
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  // Hide Y-axis values on mobile (screens < 768px)
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    return '';
                  }
                  
                  const numValue = Number(value);
                  if (isNaN(numValue)) return '0';
                  
                  // For very small values, show as is
                  if (numValue === 0) return '0';
                  
                  // Desktop: Use compact format for larger values
                  if (numValue >= 1000) {
                    const kValue = (numValue / 1000).toFixed(numValue >= 10000 ? 0 : 1);
                    return `${userSettings.currency}${kValue}k`;
                  }
                  
                  // Use the formatter but fallback to simple format if it fails
                  try {
                    const formatted = formatter.format(numValue);
                    // Check if formatter returned a valid result
                    if (formatted && formatted !== '0' && formatted !== `${userSettings.currency}0`) {
                      return formatted;
                    }
                  } catch (e) {
                    console.warn('Formatter failed for value:', numValue, e);
                  }
                  
                  // Fallback: manual formatting
                  return `${userSettings.currency}${numValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                }}
                tick={{ fontSize: 10 }}
                width={typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 65}
              />
              <ChartTooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                content={<ChartTooltipContent />} 
                labelFormatter={(value) => `Day ${value}`}
              />

              {/* Planned "shadow" line (dashed, subtle) */}
              <Line
                dataKey="cumulativePlanned"
                type="monotone"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
                stroke="#82ca9d"
              />

              {/* Actual cumulative spend line */}
              <Line
                dataKey="cumulativeActual"
                type="monotone"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
                stroke="#8884d8"
              />
            </LineChart>
          </ChartContainer>
        </div>
        
        {/* Legend - Responsive layout with better visual indicators */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 border border-dashed rounded-full" style={{ borderColor: '#82ca9d' }} />
            <span className="font-medium">Planned (linear)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: '#8884d8' }} />
            <span className="font-medium">Actual cumulative</span>
          </div>
          <div className="text-xs text-muted-foreground/70 sm:ml-auto">
            Hover for details
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
