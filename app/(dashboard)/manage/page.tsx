"use client";

import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TransactionType } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import {
  PlusSquare,
  TrashIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react";
import React from "react";
import CreateCategoryDialog from "../_components/CreateCategoryDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/generated/prisma";
import DeleteCategoryDialog from "../_components/DeleteCategoryDialog";

function page() {
  return (
    <>
      <div className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-4 md:gap-6 py-6 md:py-8 mx-auto px-4 md:px-6">
          <div className="">
            <p className="text-2xl md:text-3xl font-bold">Manage</p>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage your account setting and categories
            </p>
          </div>
        </div>
      </div>

      <div className="container flex flex-col gap-4 p-4 md:p-6 mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Currency</CardTitle>
            <CardDescription className="text-sm">
              set your default currency for transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CurrencyComboBox />
          </CardContent>
        </Card>

        <CategoryList type="income" />
        <CategoryList type="expense" />
      </div>
    </>
  );
}

export default page;

function CategoryList({ type }: { type: TransactionType }) {
  const categoriesQuery = useQuery({
    queryKey: ["categories", type],
    queryFn: () =>
      fetch(`/api/categories?type=${type}`).then((res) => res.json()),
  });

  const dataAvailable = categoriesQuery.data && categoriesQuery.data.length > 0;

  return (
    <SkeletonWrapper isLoading={categoriesQuery.isLoading}>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              {type === "expense" ? (
                <TrendingDownIcon className="h-10 w-10 md:h-12 md:w-12 items-center rounded-lg bg-red-400/10 p-2 text-red-500" />
              ) : (
                <TrendingUpIcon className="h-10 w-10 md:h-12 md:w-12 items-center rounded-lg bg-emerald-400/10 p-2 text-emerald-500" />
              )}
              <div className="">
                <h2 className="text-lg md:text-2xl font-bold">
                  {type === "expense" ? "Expenses" : "Income"} categories
                </h2>
                <div className="text-xs md:text-sm text-muted-foreground">
                  Sorted by name
                </div>
              </div>
            </div>
            <CreateCategoryDialog
              type={type}
              successCallback={() => categoriesQuery.refetch()}
              trigger={
                <Button className="gap-2 text-sm w-full sm:w-auto" size="sm">
                  <PlusSquare className="h-4 w-4" />
                  Create new
                </Button>
              }
            />
          </CardTitle>
        </CardHeader>
        <Separator />

        {!dataAvailable && (
          <div className="flex h-32 md:h-40 w-full flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No{" "}
              <span
                className={cn(
                  "m-1",
                  type === "expense" ? "text-red-500" : "text-emerald-500"
                )}
              >
                {type}
              </span>
              categories yet
            </p>
            <p className="text-sm text-muted-foreground">
              create one to get started
            </p>
          </div>
        )}
        {dataAvailable && (
          <div className="grid grid-flow-row gap-2 p-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categoriesQuery.data.map((category: Category) => (
              <CategoryCard key={category.name} category={category} />
            ))}
          </div>
        )}
      </Card>
    </SkeletonWrapper>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <div className="flex border-separate flex-col justify-between rounded-md border shadow-md shadow-black/[0.1] dark:shadow-white/[0.1]">
      <div className="flex flex-col items-center gap-2 p-3 md:p-4">
        <span className="text-2xl md:text-3xl" role="img">
          {category.icon}
        </span>
        <h3 className="text-sm md:text-lg font-semibold text-center">
          {category.name}
        </h3>
      </div>
      <DeleteCategoryDialog
        category={category}
        trigger={
          <Button
            className="flex w-full border-separate items-center gap-2 rounded-t-none text-muted-foreground hover:bg-red-500/20 text-xs md:text-sm"
            variant={"secondary"}
            size="sm"
          >
            <TrashIcon className="h-3 w-3 md:h-4 md:w-4" />
            Remove
          </Button>
        }
      />
    </div>
  );
}
