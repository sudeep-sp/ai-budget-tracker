"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, DollarSign, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RecordPaymentSchema,
  RecordPaymentSchemaType,
} from "@/schema/shared-expenses";
import { formatCurrency } from "@/lib/shared-utils";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  split: {
    id: string;
    amount: number;
    userId: string;
    userName?: string;
    expense: {
      id: string;
      description: string;
      groupId: string;
    };
    payments: { amount: number }[];
  };
  currency: string;
}

const paymentMethods = [
  { value: "cash", label: "💵 Cash" },
  { value: "venmo", label: "📱 Venmo" },
  { value: "paypal", label: "💙 PayPal" },
  { value: "bank_transfer", label: "🏦 Bank Transfer" },
  { value: "zelle", label: "⚡ Zelle" },
  { value: "other", label: "💳 Other" },
];

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  split,
  currency,
}: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();

  const alreadyPaid = split.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const remainingAmount = split.amount - alreadyPaid;

  const form = useForm<RecordPaymentSchemaType>({
    resolver: zodResolver(RecordPaymentSchema),
    defaultValues: {
      splitId: split.id,
      amount: remainingAmount,
      method: "cash",
      notes: "",
      date: new Date(),
    },
  });

  const { mutate: recordPayment, isPending } = useMutation({
    mutationFn: async (data: RecordPaymentSchemaType) => {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record payment");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully! 💰");
      form.reset();
      onOpenChange(false);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["expense-group", split.expense.groupId],
      });
      queryClient.invalidateQueries({
        queryKey: ["group-balances", split.expense.groupId],
      });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const onSubmit = (data: RecordPaymentSchemaType) => {
    recordPayment(data);
  };

  // Reset form when split changes
  React.useEffect(() => {
    if (split) {
      form.reset({
        splitId: split.id,
        amount: remainingAmount,
        method: "cash",
        notes: "",
        date: new Date(),
      });
    }
  }, [split, remainingAmount, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription className="text-sm">
            Record a payment for &ldquo;{split.expense.description}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Payment Summary */}
        <div className="bg-muted/50 p-3 md:p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-xs md:text-sm">
            <span>Total Amount:</span>
            <span className="font-semibold">
              {formatCurrency(split.amount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-xs md:text-sm">
            <span>Already Paid:</span>
            <span className="text-green-600">
              {formatCurrency(alreadyPaid, currency)}
            </span>
          </div>
          <div className="flex justify-between text-xs md:text-sm font-semibold border-t pt-2">
            <span>Remaining:</span>
            <span className="text-orange-600">
              {formatCurrency(remainingAmount, currency)}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="amount"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Payment Amount *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      max={remainingAmount}
                      placeholder="0.00"
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Maximum: {formatCurrency(remainingAmount, currency)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                name="method"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Payment Method</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="date"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal text-sm",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "MMM dd")
                            ) : (
                              <span>Pick date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional payment details..."
                      rows={2}
                      maxLength={500}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
