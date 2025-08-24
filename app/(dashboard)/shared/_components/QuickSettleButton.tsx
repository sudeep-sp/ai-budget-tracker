"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

  const settleMutation = useMutation({
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
        throw new Error(error.message || "Failed to settle payment");
      }

      return response.json();
    },
    onMutate: () => {
      // Optimistic update
      onOptimisticUpdate?.();
      toast.loading(`Recording payment from ${memberName}...`, {
        id: `settle-${splitId}`,
      });
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
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record payment", {
        id: `settle-${splitId}`,
      });
    },
  });

  if (isPaid) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <Check className="h-3 w-3" />
        <span className="text-xs font-medium">Paid</span>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs border-orange-200 hover:border-green-200 hover:bg-green-50"
        >
          <Clock className="h-3 w-3 mr-1" />
          {formatCurrency(amount, currency)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Mark Payment as Settled</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure {memberName} has paid{" "}
            {formatCurrency(amount, currency)} for their share of this expense?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settleMutation.mutate()}
            disabled={settleMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {settleMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Mark as Paid
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
