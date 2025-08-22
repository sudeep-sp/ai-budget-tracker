"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE_DAYS } from "@/lib/constants";
import { differenceInDays, startOfMonth } from "date-fns";
import React from "react";
import { toast } from "sonner";
import TransactionTable from "./_components/TransactionTable";

function TransactionsPage() {
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  return (
    <>
      <div className="border-b bg-card">
        <div className="container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 py-6 md:py-8 mx-auto px-4 md:px-6">
          <div className="">
            <p className="text-2xl md:text-3xl font-bold">
              Transaction history
            </p>
          </div>
          <div className="w-full sm:w-auto">
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
      </div>

      <div className="container mx-auto px-4 md:px-6">
        <TransactionTable from={dateRange.from} to={dateRange.to} />
      </div>
    </>
  );
}

export default TransactionsPage;
