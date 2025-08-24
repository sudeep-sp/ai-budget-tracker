"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Eye,
  Users,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/shared-utils";

interface ExpenseDetailsSheetProps {
  expense: any;
  memberMap: Map<string, string>;
  currency: string;
  children?: React.ReactNode;
}

export default function ExpenseDetailsSheet({
  expense,
  memberMap,
  currency,
  children,
}: ExpenseDetailsSheetProps) {
  // Calculate payment progress
  const totalAmount = expense.amount;
  const paidAmount =
    expense.splits?.reduce((sum: number, split: any) => {
      return split.isPaid ? sum + split.amount : sum;
    }, 0) || 0;
  const paymentProgress =
    totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const getPaymentStatusColor = (isPaid: boolean) => {
    return isPaid ? "text-green-600" : "text-orange-600";
  };

  const getPaymentStatusIcon = (isPaid: boolean) => {
    return isPaid ? (
      <Check className="h-4 w-4" />
    ) : (
      <Clock className="h-4 w-4" />
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Details
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-2xl">{expense.categoryIcon}</span>
            <span className="truncate">{expense.description}</span>
          </SheetTitle>
          <SheetDescription>
            Expense details and payment status
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Amount:</span>
              <span className="text-lg font-bold">
                {formatCurrency(expense.amount, currency)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Paid by:</span>
              <span className="font-medium">
                {memberMap.get(expense.paidBy) || "Unknown"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Category:</span>
              <Badge variant="outline">{expense.category}</Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Date:</span>
              <span className="text-sm">
                {new Date(expense.date).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Payment Progress:</span>
              <span className="text-sm font-medium">
                {Math.round(paymentProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  paymentProgress === 100
                    ? "bg-green-500"
                    : paymentProgress > 0
                    ? "bg-orange-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(paidAmount, currency)} of{" "}
              {formatCurrency(totalAmount, currency)} paid
            </div>
          </div>

          {/* Split Details */}
          {expense.splits && expense.splits.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Split Details ({expense.splits.length} people)
                </span>
              </div>

              <div className="space-y-2">
                {expense.splits.map((split: any) => (
                  <div
                    key={split.id}
                    className={`flex justify-between items-center p-3 rounded-lg border-l-4 ${
                      split.isPaid
                        ? "border-l-green-500 bg-green-50"
                        : "border-l-orange-500 bg-orange-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getPaymentStatusIcon(split.isPaid)}
                      <span className="font-medium">
                        {memberMap.get(split.userId) || "Unknown"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-bold ${getPaymentStatusColor(
                          split.isPaid
                        )}`}
                      >
                        {formatCurrency(split.amount, currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {split.isPaid ? "Paid" : "Pending"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {paymentProgress === 100 ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Fully Settled
                  </span>
                </>
              ) : paymentProgress > 0 ? (
                <>
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">
                    Partially Paid
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    Unpaid
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentProgress === 100
                ? "All participants have settled their shares."
                : `${
                    expense.splits?.filter((s: any) => !s.isPaid).length || 0
                  } payment(s) still pending.`}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
