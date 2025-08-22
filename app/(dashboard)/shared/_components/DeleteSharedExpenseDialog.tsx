"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
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
import { DeleteSharedExpense } from "../_action/deleteSharedExpense";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  expenseId: string;
  groupId: string;
}

function DeleteSharedExpenseDialog({
  open,
  setOpen,
  expenseId,
  groupId,
}: Props) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: DeleteSharedExpense,
    onSuccess: async () => {
      toast.success("Shared expense deleted successfully", {
        id: expenseId,
      });

      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["expense-group", groupId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["group-balances", groupId],
        }),
      ]);

      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete expense", {
        id: expenseId,
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base md:text-lg">
            Are you sure you want to delete this expense?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            This action cannot be undone. This will permanently delete the
            expense and all related splits and payments.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <AlertDialogCancel className="w-full sm:w-auto">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              toast.loading("Deleting expense...", { id: expenseId });
              deleteMutation.mutate(expenseId);
            }}
            disabled={deleteMutation.isPending}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteSharedExpenseDialog;
