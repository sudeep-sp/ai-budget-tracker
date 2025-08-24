"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Clock, AlertCircle, Loader2, Users } from "lucide-react";
import { formatCurrency } from "@/lib/shared-utils";

interface SendReminderButtonProps {
  expense: any;
  memberMap: Map<string, string>;
  currency: string;
  groupId: string;
}

export default function SendReminderButton({
  expense,
  memberMap,
  currency,
  groupId,
}: SendReminderButtonProps) {
  const [showReminderDialog, setShowReminderDialog] = React.useState(false);
  const [reminderType, setReminderType] = React.useState<"all" | "unpaid">(
    "unpaid"
  );
  const queryClient = useQueryClient();

  const unpaidSplits =
    expense.splits?.filter((split: any) => !split.isPaid) || [];
  const allSplits = expense.splits || [];

  const reminderMutation = useMutation({
    mutationFn: async ({ type }: { type: "all" | "unpaid" }) => {
      const response = await fetch(`/api/groups/${groupId}/reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expenseId: expense.id,
          reminderType: type,
          message: `Reminder: Payment needed for "${expense.description}"`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reminder");
      }

      return response.json();
    },
    onSuccess: (_, { type }) => {
      const count = type === "all" ? allSplits.length : unpaidSplits.length;
      toast.success(`Reminder sent to ${count} member${count > 1 ? "s" : ""}!`);
      setShowReminderDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send reminder");
    },
  });

  if (unpaidSplits.length === 0) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200">
        <Clock className="h-3 w-3 mr-1" />
        All Paid
      </Badge>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="h-4 w-4" />
            Remind
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Send Payment Reminder</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setReminderType("unpaid");
              setShowReminderDialog(true);
            }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-medium">Unpaid Members</div>
                <div className="text-xs text-muted-foreground">
                  {unpaidSplits.length} member
                  {unpaidSplits.length > 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setReminderType("all");
              setShowReminderDialog(true);
            }}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">All Members</div>
                <div className="text-xs text-muted-foreground">
                  {allSplits.length} member{allSplits.length > 1 ? "s" : ""}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={showReminderDialog}
        onOpenChange={setShowReminderDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Payment Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              {reminderType === "unpaid" ? (
                <>
                  Send a payment reminder to{" "}
                  <strong>{unpaidSplits.length}</strong> member
                  {unpaidSplits.length > 1 ? "s" : ""} who haven&apos;t paid
                  their share for &quot;{expense.description}&quot;?
                </>
              ) : (
                <>
                  Send a payment reminder to all{" "}
                  <strong>{allSplits.length}</strong> member
                  {allSplits.length > 1 ? "s" : ""} for the expense &quot;
                  {expense.description}&quot;?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                {reminderType === "unpaid" ? "Unpaid Members:" : "All Members:"}
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {(reminderType === "unpaid" ? unpaidSplits : allSplits).map(
                  (split: any) => (
                    <div
                      key={split.id}
                      className="flex justify-between items-center text-sm p-2 bg-muted rounded"
                    >
                      <span>{memberMap.get(split.userId) || "Unknown"}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {formatCurrency(split.amount, currency)}
                        </span>
                        {split.isPaid ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200 text-xs"
                          >
                            Paid
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200 text-xs"
                          >
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reminderMutation.mutate({ type: reminderType })}
              disabled={reminderMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {reminderMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
