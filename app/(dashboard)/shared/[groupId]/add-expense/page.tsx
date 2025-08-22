"use client";

import React, { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, DollarSign, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CreateSharedExpenseSchema,
  CreateSharedExpenseSchemaType,
} from "@/schema/shared-expenses";
import { formatCurrency } from "@/lib/shared-utils";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import CategoryPicker from "../../../_components/CategoryPicker";

interface AddExpensePageProps {
  params: Promise<{ groupId: string }>;
}

export default function AddExpensePage({ params }: AddExpensePageProps) {
  const { groupId } = use(params);
  const router = useRouter();
  const [splitType, setSplitType] = useState<
    "equal" | "percentage" | "custom" | "shares"
  >("equal");

  const groupQuery = useQuery({
    queryKey: ["expense-group", groupId],
    queryFn: () => fetch(`/api/groups/${groupId}`).then((res) => res.json()),
  });

  const form = useForm<CreateSharedExpenseSchemaType>({
    resolver: zodResolver(CreateSharedExpenseSchema),
    defaultValues: {
      groupId,
      amount: 0,
      description: "",
      category: "",
      categoryIcon: "💰",
      date: new Date(),
      paidBy: "",
      splitType: "equal" as const,
      splits: [],
      isRecurring: false,
    },
  });

  const { mutate: createExpense, isPending } = useMutation({
    mutationFn: async (data: CreateSharedExpenseSchemaType) => {
      console.log("Sending expense data:", data);
      const response = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        console.log("API Error:", error);
        throw new Error(error.error || "Failed to create expense");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Expense added successfully! 🎉");
      router.push(`/shared/${groupId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create expense");
    },
  });

  // Auto-create categories if they don't exist - CategoryPicker handles this internally
  const { mutate: createCategory } = useMutation({
    mutationFn: async (categoryData: {
      name: string;
      icon: string;
      type: string;
    }) => {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) throw new Error("Failed to create category");
      return response.json();
    },
  });

  const group = groupQuery.data;
  const members = group?.members || [];

  // Set default paidBy to current user if available
  React.useEffect(() => {
    if (members.length > 0 && !form.getValues("paidBy")) {
      const currentUser =
        members.find((m: any) => m.role === "owner") || members[0];
      form.setValue("paidBy", currentUser.userId);
    }
  }, [members, form]);

  // Update splits when split type or amount changes
  React.useEffect(() => {
    if (members.length > 0) {
      const splits = members.map((member: any) => ({
        userId: member.userId,
        amount: splitType === "custom" ? 0 : undefined,
        percentage: splitType === "percentage" ? 0 : undefined,
        shares: splitType === "shares" ? 1 : undefined,
      }));
      form.setValue("splits", splits);
    }
  }, [splitType, members, form]);

  const onSubmit = (data: CreateSharedExpenseSchemaType) => {
    // Validate splits based on type
    const amount = data.amount;
    const splits = data.splits;

    if (splitType === "percentage") {
      const totalPercentage = splits.reduce(
        (sum, split) => sum + (split.percentage || 0),
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error("Percentages must add up to 100%");
        return;
      }
    }

    if (splitType === "custom") {
      const totalAmount = splits.reduce(
        (sum, split) => sum + (split.amount || 0),
        0
      );
      if (Math.abs(totalAmount - amount) > 0.01) {
        toast.error("Custom amounts must add up to total expense");
        return;
      }
    }

    console.log("Submitting data:", data);
    createExpense(data);
  };

  if (groupQuery.isError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Failed to load group data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <SkeletonWrapper isLoading={groupQuery.isLoading}>
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <Link href={`/shared/${groupId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Add Shared Expense
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Add a new expense to split among group members
              </p>
            </div>
          </div>

          {group && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 md:space-y-8"
              >
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                  {/* Left Column - Expense Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
                        Expense Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        name="amount"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Amount *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-xs md:text-sm">
                              Total amount in {group.currency}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="description"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">
                              Description *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., Groceries, Dinner, Rent"
                                maxLength={200}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        name="category"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-sm">
                              Category *
                            </FormLabel>
                            <FormControl>
                              <CategoryPicker
                                type="expense"
                                onChange={(categoryName: string) => {
                                  field.onChange(categoryName);
                                  // Set a default icon - CategoryPicker will handle the actual icon
                                  form.setValue("categoryIcon", "💰");
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          name="date"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Date</FormLabel>
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
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-0"
                                  align="start"
                                >
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

                        <FormField
                          name="paidBy"
                          control={form.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                Paid By *
                              </FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select member" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {members.map((member: any) => (
                                      <SelectItem
                                        key={member.userId}
                                        value={member.userId}
                                      >
                                        {member.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Column - Split Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                        <Users className="h-4 w-4 md:h-5 md:w-5" />
                        Split Between Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Split Type Selection */}
                      <div>
                        <Label className="text-sm font-medium">
                          Split Type
                        </Label>
                        <RadioGroup
                          value={splitType}
                          onValueChange={(value: any) => {
                            setSplitType(value);
                            form.setValue("splitType", value);
                          }}
                          className="grid grid-cols-2 gap-3 md:gap-4 mt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="equal" id="equal" />
                            <Label htmlFor="equal" className="text-sm">
                              Equal
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="percentage"
                              id="percentage"
                            />
                            <Label htmlFor="percentage" className="text-sm">
                              Percentage
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom" className="text-sm">
                              Custom
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="shares" id="shares" />
                            <Label htmlFor="shares" className="text-sm">
                              Shares
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Members Split Configuration */}
                      <div className="space-y-3">
                        {members.map((member: any, index: number) => (
                          <SplitMemberRow
                            key={member.userId}
                            member={member}
                            index={index}
                            splitType={splitType}
                            form={form}
                            totalAmount={form.watch("amount") || 0}
                            currency={group.currency}
                          />
                        ))}
                      </div>

                      {/* Split Summary */}
                      <SplitSummary
                        splits={form.watch("splits")}
                        splitType={splitType}
                        totalAmount={form.watch("amount") || 0}
                        currency={group.currency}
                        members={members}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Expense
                  </Button>
                  <Link href={`/shared/${groupId}`} className="sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </div>
      </SkeletonWrapper>
    </div>
  );
}

function SplitMemberRow({
  member,
  index,
  splitType,
  form,
  totalAmount,
  currency,
}: any) {
  const splits = form.watch("splits") || [];
  const currentSplit = splits[index] || {};

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs">
          {member.name}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {splitType === "equal" && (
          <span className="text-xs md:text-sm font-medium">
            {formatCurrency(totalAmount / splits.length || 0, currency)}
          </span>
        )}

        {splitType === "percentage" && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="0"
              value={currentSplit.percentage || ""}
              onChange={(e) => {
                const newSplits = [...splits];
                newSplits[index] = {
                  ...newSplits[index],
                  percentage: parseFloat(e.target.value) || 0,
                };
                form.setValue("splits", newSplits);
              }}
              className="w-12 md:w-16 h-8 text-xs"
              min="0"
              max="100"
            />
            <span className="text-xs">%</span>
            <span className="text-xs text-muted-foreground min-w-12 md:min-w-16">
              (
              {formatCurrency(
                (totalAmount * (currentSplit.percentage || 0)) / 100,
                currency
              )}
              )
            </span>
          </div>
        )}

        {splitType === "custom" && (
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={currentSplit.amount || ""}
            onChange={(e) => {
              const newSplits = [...splits];
              newSplits[index] = {
                ...newSplits[index],
                amount: parseFloat(e.target.value) || 0,
              };
              form.setValue("splits", newSplits);
            }}
            className="w-20 md:w-24 h-8 text-xs"
          />
        )}

        {splitType === "shares" && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="1"
              value={currentSplit.shares || ""}
              onChange={(e) => {
                const newSplits = [...splits];
                newSplits[index] = {
                  ...newSplits[index],
                  shares: parseInt(e.target.value) || 1,
                };
                form.setValue("splits", newSplits);
              }}
              className="w-12 md:w-16 h-8 text-xs"
              min="0"
            />
            <span className="text-xs text-muted-foreground">shares</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SplitSummary({
  splits,
  splitType,
  totalAmount,
  currency,
  members,
}: any) {
  const calculateTotal = () => {
    if (splitType === "percentage") {
      return splits.reduce(
        (sum: number, split: any) => sum + (split.percentage || 0),
        0
      );
    }
    if (splitType === "custom") {
      return splits.reduce(
        (sum: number, split: any) => sum + (split.amount || 0),
        0
      );
    }
    if (splitType === "shares") {
      const totalShares = splits.reduce(
        (sum: number, split: any) => sum + (split.shares || 0),
        0
      );
      return totalShares;
    }
    return totalAmount;
  };

  const total = calculateTotal();
  const isValid =
    splitType === "equal" ||
    (splitType === "percentage" && Math.abs(total - 100) < 0.01) ||
    (splitType === "custom" && Math.abs(total - totalAmount) < 0.01) ||
    (splitType === "shares" && total > 0);

  return (
    <div className="border-t pt-3">
      <div className="flex justify-between items-center">
        <span className="text-xs md:text-sm font-medium">Total:</span>
        <span
          className={`text-xs md:text-sm font-bold ${
            isValid ? "text-green-600" : "text-red-600"
          }`}
        >
          {splitType === "percentage" && `${total}%`}
          {splitType === "custom" && formatCurrency(total, currency)}
          {splitType === "shares" && `${total} shares`}
          {splitType === "equal" && formatCurrency(totalAmount, currency)}
        </span>
      </div>
      {!isValid && (
        <p className="text-xs text-red-600 mt-1">
          {splitType === "percentage" && "Must add up to 100%"}
          {splitType === "custom" &&
            `Must add up to ${formatCurrency(totalAmount, currency)}`}
          {splitType === "shares" && "Must have at least 1 share"}
        </p>
      )}
    </div>
  );
}
