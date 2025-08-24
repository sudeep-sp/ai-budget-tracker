"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Category } from "@/lib/generated/prisma";
import { TransactionType } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo } from "react";
import CreateCategoryDialog from "./CreateCategoryDialog";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  type: TransactionType;
  onChange: (value: string) => void;
  onCategoryChange?: (category: { name: string; icon: string }) => void;
}

function CategoryPicker({ type, onChange, onCategoryChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");

  const categoriesQuery = useQuery({
    queryKey: ["categories", type],
    queryFn: async () => {
      const res = await fetch(`/api/categories?type=${type}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.statusText}`);
      }
      return res.json();
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Deduplicate categories by name, keeping the most recently created one
  const uniqueCategories = useMemo(() => {
    if (!categoriesQuery.data) return [];

    const categoryMap = new Map<string, Category>();

    categoriesQuery.data.forEach((category: Category) => {
      const key = category.name.toLowerCase();
      const existing = categoryMap.get(key);

      // Keep the most recently created category
      if (!existing || category.createdAt > existing.createdAt) {
        categoryMap.set(key, category);
      }
    });

    return Array.from(categoryMap.values());
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (!value) return;
    onChange(value); //when the value changes , call the onChange callback

    // Also call onCategoryChange if provided
    if (onCategoryChange) {
      const selectedCategory = uniqueCategories.find(
        (category: Category) => category.name === value
      );
      if (selectedCategory) {
        onCategoryChange({
          name: selectedCategory.name,
          icon: selectedCategory.icon,
        });
      }
    }
  }, [value, onChange, onCategoryChange, uniqueCategories]);

  const selectedCategory = uniqueCategories.find(
    (category: Category) => category.name === value
  );

  const successCallback = useCallback(
    (category: Category) => {
      setValue(category.name);
      setOpen((prev) => !prev);
    },
    [setValue, setOpen]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {selectedCategory ? (
            <CategoryRow category={selectedCategory} />
          ) : (
            "Select a category"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <CommandInput placeholder="Search categories..." />
          <CreateCategoryDialog type={type} successCallback={successCallback} />
          <CommandEmpty>
            {categoriesQuery.isError ? (
              <>
                <p>Error loading categories</p>
                <p className="text-xs text-muted-foreground">
                  Please try again later
                </p>
              </>
            ) : (
              <>
                <p>No categories found</p>
                <p className="text-xs text-muted-foreground">
                  Try creating a new category
                </p>
              </>
            )}
          </CommandEmpty>
          <CommandGroup>
            <CommandList>
              {uniqueCategories.map((category: Category) => (
                <CommandItem
                  key={category.name}
                  onSelect={() => {
                    setValue(category.name);
                    setOpen((prev) => !prev);
                  }}
                >
                  <CategoryRow category={category} />
                  <Check
                    className={cn(
                      "mr-2 w-4 h-4 opacity-0",
                      value === category.name && "opacity-100"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CategoryRow({ category }: { category: Category }) {
  return (
    <div className="flex items-center gap-2">
      <span role="img">{category.icon}</span>
      <span>{category.name}</span>
    </div>
  );
}

export default CategoryPicker;
