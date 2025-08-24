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

  const handleQuickSettle = async () => {
    try {
      toast.loading(`Recording payment from ${memberName}...`, {
        id: `settle-${splitId}`,
      });

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

      const result = await response.json();

      toast.success(`Payment recorded successfully!`, {
        id: `settle-${splitId}`,
      });

      // Refresh data and trigger optimistic update
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expense-group", groupId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["group-balances", groupId],
        }),
      ]);

      onOptimisticUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment", {
        id: `settle-${splitId}`,
      });
    }
  };

  if (isPaid) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <Check className="h-3 w-3" />
        <span className="text-xs font-medium">Paid</span>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-6 px-2 text-xs border-orange-200 hover:border-green-200 hover:bg-green-50"
      onClick={handleQuickSettle}
    >
      <Clock className="h-3 w-3 mr-1" />
      {formatCurrency(amount, currency)}
    </Button>
  );
}
