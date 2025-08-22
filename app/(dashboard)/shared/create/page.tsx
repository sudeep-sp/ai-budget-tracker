"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
import { currencies } from "@/lib/currencies";
import {
  CreateGroupSchema,
  CreateGroupSchemaType,
} from "@/schema/shared-expenses";

export default function CreateGroupPage() {
  const router = useRouter();

  const form = useForm<CreateGroupSchemaType>({
    resolver: zodResolver(CreateGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      currency: "USD",
    },
  });

  const { mutate: createGroup, isPending } = useMutation({
    mutationFn: async (data: CreateGroupSchemaType) => {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create group");
      }

      return response.json();
    },
    onSuccess: (group) => {
      toast.success("Group created successfully! 🎉");
      router.push(`/shared/${group.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create group");
    },
  });

  const onSubmit = (data: CreateGroupSchemaType) => {
    createGroup(data);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/shared">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Create New Group</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Set up a shared budget group to split expenses with others
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Group Details</CardTitle>
            <CardDescription className="text-sm">
              Enter the basic information for your new expense group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 md:space-y-6"
              >
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Group Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Apartment 4B, College Friends, Office Team"
                          maxLength={50}
                        />
                      </FormControl>
                      <FormDescription className="text-xs md:text-sm">
                        Choose a name that helps identify this expense group
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
                      <FormLabel className="text-sm">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Optional description of what this group is for"
                          rows={3}
                          maxLength={200}
                        />
                      </FormControl>
                      <FormDescription className="text-xs md:text-sm">
                        Brief description of the group&apos;s purpose (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="currency"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Currency</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem
                                key={currency.value}
                                value={currency.value}
                              >
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription className="text-xs md:text-sm">
                        Default currency for all expenses in this group
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Group
                  </Button>
                  <Link href="/shared" className="sm:w-auto">
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
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              What&apos;s Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs md:text-sm text-muted-foreground">
            <p>
              • After creating the group, you&apos;ll become the group owner
            </p>
            <p>• Invite members by email to join your group</p>
            <p>• Add shared expenses and split them among group members</p>
            <p>• Track who owes what and settle payments easily</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
