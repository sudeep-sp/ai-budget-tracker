"use client";

import { GetSpendingPredictionResponseType } from "@/app/api/spending-prediction/route";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { UserSettings } from "@/lib/generated/prisma";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SpendingPredictionChart } from "./SpendingPredictionChart";

interface Props {
  userSettings: UserSettings;
}

function SpendingPredictionWrapper({ userSettings }: Props) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const spendingQuery = useQuery<GetSpendingPredictionResponseType>({
    queryKey: ["spending", "prediction", selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await fetch(
        `/api/spending-prediction?year=${selectedYear}&month=${selectedMonth}`
      );
      const data = await response.json();
      console.log("API Response:", {
        year: selectedYear,
        month: selectedMonth,
        dataLength: data.length,
      });
      return data;
    },
  });

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const selectedMonthName = new Date(
    selectedYear,
    selectedMonth,
    1
  ).toLocaleDateString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <SkeletonWrapper isLoading={spendingQuery.isFetching}>
      <SpendingPredictionChart
        data={spendingQuery.data || []}
        userSettings={userSettings}
        monthlyBudget={userSettings.monthlyBudget || undefined}
        selectedMonth={selectedMonthName}
        selectedYear={selectedYear}
        selectedMonthNum={selectedMonth}
        onMonthChange={handleMonthChange}
      />
    </SkeletonWrapper>
  );
}

export default SpendingPredictionWrapper;
