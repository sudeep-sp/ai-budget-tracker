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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Quick Settlement
            </CardTitle>
            <CardDescription>
              These payments will settle all balances with minimum transactions
            </CardDescription>
          </div>
          {settlements.length > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Settle All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
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
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1">
              <Badge variant="secondary" className="text-xs">
                #{index + 1}
              </Badge>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{settlement.fromUserName}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{settlement.toUserName}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {formatCurrency(settlement.amount, currency)}
              </Badge>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4 mr-1" />
                  Settle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
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
