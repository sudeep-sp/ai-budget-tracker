"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Clock, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/shared-utils";

interface QuickSettleButtonProps {
  splitId: string;
  amount: number;
  currency: string;
  isPaid: boolean;
  groupId: string;
  memberName: string;
  onOptimisticUpdate?: () => void;
}

export default function QuickSettleButton({
  splitId,
  amount,
  currency,
  isPaid,
  groupId,
  memberName,
  onOptimisticUpdate,
}: QuickSettleButtonProps) {
  const queryClient = useQueryClient();

  const quickSettleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/quick-settle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          splitId,
          amount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || error.message || "Failed to settle payment"
        );
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success(`Payment recorded successfully!`, {
        id: `settle-${splitId}`,
      });

      // Invalidate queries to refresh data
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expense-group", groupId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["group-balances", groupId],
        }),
      ]);

      onOptimisticUpdate?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record payment", {
        id: `settle-${splitId}`,
      });
    },
  });

  const handleQuickSettle = () => {
    toast.loading(`Recording payment from ${memberName}...`, {
      id: `settle-${splitId}`,
    });
    quickSettleMutation.mutate();
  };

  if (isPaid) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="text-xs sm:text-sm font-medium">Paid</span>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 sm:h-6 px-3 sm:px-2 text-xs sm:text-xs border-orange-200 hover:border-green-200 hover:bg-green-50 min-w-[60px] sm:min-w-[50px] touch-manipulation"
      onClick={handleQuickSettle}
      disabled={quickSettleMutation.isPending}
    >
      {quickSettleMutation.isPending ? (
        <Loader2 className="h-3 w-3 sm:h-3 sm:w-3 mr-1 animate-spin" />
      ) : (
        <Clock className="h-3 w-3 sm:h-3 sm:w-3 mr-1" />
      )}
      <span className="truncate">{formatCurrency(amount, currency)}</span>
    </Button>
  );
}
