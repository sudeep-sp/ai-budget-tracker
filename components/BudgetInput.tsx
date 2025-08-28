"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SkeletonWrapper from "./SkeletonWrapper";
import { UserSettings } from "@/lib/generated/prisma";
import { UpdateUserBudget } from "@/app/wizard/_actions/userSettings";

export function BudgetInput() {
  const [value, setValue] = React.useState<string>("");

  const userSettings = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
  });

  React.useEffect(() => {
    if (userSettings.data?.monthlyBudget) {
      setValue(userSettings.data.monthlyBudget.toString());
    }
  }, [userSettings.data]);

  const mutation = useMutation({
    mutationFn: UpdateUserBudget,
    onSuccess: () => {
      toast.success("Monthly budget updated successfully 🎉", {
        id: "update-budget",
      });
    },
    onError: (e) => {
      toast.error("Something went wrong", {
        id: "update-budget",
      });
    },
  });

  const handleSave = () => {
    const numValue = value ? parseFloat(value) : undefined;
    
    if (value && (isNaN(numValue!) || numValue! < 0)) {
      toast.error("Please enter a valid positive number");
      return;
    }

    toast.loading("Updating monthly budget...", {
      id: "update-budget",
    });

    mutation.mutate(numValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <SkeletonWrapper isLoading={userSettings.isFetching}>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Enter monthly budget"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={mutation.isPending}
          min="0"
          step="0.01"
        />
        <Button 
          onClick={handleSave} 
          disabled={mutation.isPending}
          variant="outline"
        >
          Save
        </Button>
      </div>
    </SkeletonWrapper>
  );
}