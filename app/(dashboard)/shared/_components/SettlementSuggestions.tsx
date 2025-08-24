"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Zap, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/shared-utils";
import { SettlementSuggestion } from "@/lib/shared-types";

interface SettlementSuggestionsProps {
  settlements: SettlementSuggestion[];
  currency: string;
  groupId: string;
}

export default function SettlementSuggestions({
  settlements,
  currency,
  groupId,
}: SettlementSuggestionsProps) {
  const queryClient = useQueryClient();

  const settlementMutation = useMutation({
    mutationFn: async (settlement: SettlementSuggestion) => {
      const response = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromUserId: settlement.fromUserId,
          toUserId: settlement.toUserId,
          amount: settlement.amount,
          relatedExpenses: settlement.relatedExpenses,
          isNetted: settlement.isNetted || false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to record settlement");
      }

      return response.json();
    },
    onSuccess: (_, settlement) => {
      toast.success(
        `Settlement recorded: ${settlement.fromUserName} → ${settlement.toUserName}`
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["expense-group", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["group-balances", groupId],
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record settlement");
    },
  });

  const bulkSettleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/settlements/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settlements: settlements.map((s) => ({
            fromUserId: s.fromUserId,
            toUserId: s.toUserId,
            amount: s.amount,
            relatedExpenses: s.relatedExpenses,
            isNetted: s.isNetted || false,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to record bulk settlements");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("All settlements recorded successfully!");

      queryClient.invalidateQueries({
        queryKey: ["expense-group", groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["group-balances", groupId],
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record bulk settlements");
    },
  });

  if (settlements.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Check className="h-8 w-8 mx-auto text-green-500 mb-3" />
          <h3 className="text-lg font-semibold mb-2">All Settled Up!</h3>
          <p className="text-sm text-muted-foreground">
            No outstanding balances to settle.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Zap className="h-5 w-5 text-orange-500" />
              Quick Settlement
            </CardTitle>
            <CardDescription className="text-sm">
              These payments will settle all balances with minimum transactions
            </CardDescription>
          </div>
          {settlements.length > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Settle All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Settle All Balances</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will record all {settlements.length} settlement
                    payments and mark all related expenses as settled. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => bulkSettleMutation.mutate()}
                    disabled={bulkSettleMutation.isPending}
                  >
                    {bulkSettleMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      "Confirm All Settlements"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {settlements.map((settlement, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                #{index + 1}
              </Badge>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm min-w-0">
                <span className="font-medium truncate">
                  {settlement.fromUserName}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <span className="font-medium truncate">
                  {settlement.toUserName}
                </span>
              </div>
              <Badge
                variant="outline"
                className="font-mono text-xs flex-shrink-0"
              >
                {formatCurrency(settlement.amount, currency)}
              </Badge>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto touch-manipulation"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Settle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
                  <AlertDialogDescription>
                    Record that <strong>{settlement.fromUserName}</strong> has
                    paid{" "}
                    <strong>
                      {formatCurrency(settlement.amount, currency)}
                    </strong>{" "}
                    to <strong>{settlement.toUserName}</strong>?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => settlementMutation.mutate(settlement)}
                    disabled={settlementMutation.isPending}
                  >
                    {settlementMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      "Confirm Settlement"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>{settlements.length}</strong> payment
            {settlements.length > 1 ? "s" : ""} will settle all outstanding
            balances
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
