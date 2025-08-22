"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { UserSettings } from "@/lib/generated/prisma";
import { User } from "@clerk/nextjs/server";
import { differenceInDays, startOfMonth } from "date-fns";
import React, { useState } from "react";
import { toast } from "sonner";
import StatsCards from "./StatsCards";
import CategoriesStats from "./CategoriesStats";

function Overview({ userSettings }: { userSettings: UserSettings }) {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  return (
    <>
      <div className="container mx-auto flex flex-col sm:flex-row flex-wrap items-start sm:items-end justify-between gap-4 p-4 md:py-6">
        <h2 className="text-2xl md:text-3xl font-bold">Overview</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            showCompare={false}
            onUpdate={(values) => {
              const { from, to } = values.range;
              //we update the date only both date are set
              if (!from || !to) return;
              if (differenceInDays(to, from) > MAX_DATE_RANGE_DAYS) {
                toast.error(
                  `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days.`
                );
                return;
              }
              setDateRange({ from, to });
            }}
          />
        </div>
      </div>

      <div className="container flex w-full flex-col gap-4 mx-auto px-4">
        <StatsCards
          userSettings={userSettings}
          from={dateRange.from}
          to={dateRange.to}
        />

        <CategoriesStats
          userSettings={userSettings}
          from={dateRange.from}
          to={dateRange.to}
        />
      </div>
    </>
  );
}

export default Overview;
