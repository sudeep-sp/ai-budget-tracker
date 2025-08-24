"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  CreateCategorySchema,
  CreateCategorySchemaType,
} from "@/schema/categories";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleOff, Loader2, PlusSquare } from "lucide-react";
import React, { useCallback } from "react";
import { useForm } from "react-hook-form";

import EmojiPicker from "emoji-picker-react";
import { emoji } from "zod";
import { CreateCategory } from "../_action/categories";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Category } from "@/lib/generated/prisma";
import { toast } from "sonner";
import { useTheme } from "next-themes";

interface Props {
  type: TransactionType;
  successCallback: (category: Category) => void;
  trigger?: React.ReactNode;
}

function CreateCategoryDialog({ type, successCallback, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);
  const form = useForm<CreateCategorySchemaType>({
    resolver: zodResolver(CreateCategorySchema),
    defaultValues: {
      type: type,
      name: "",
      icon: "",
    },
  });

  const queryClient = useQueryClient();
  const theme = useTheme();

  const { mutate, isPending } = useMutation({
    mutationFn: CreateCategory,
    onSuccess: async (data: Category) => {
      form.reset({
        type: type,
        name: "",
        icon: "",
      });

      toast.success(`Category "${data.name}" created successfully 🎉`, {
        id: "create-category",
      });

      successCallback(data);

      // Invalidate all category-related queries to ensure proper refresh
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["categories"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["categories", type],
        }),
        queryClient.invalidateQueries({
          queryKey: ["categories", "income"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["categories", "expense"],
        }),
      ]);

      setOpen((prev) => !prev);
    },

    onError: () => {
      toast.error("Something went wrong while creating the category", {
        id: "create-category",
      });
    },
  });

  const onSubmit = useCallback(
    (value: CreateCategorySchemaType) => {
      toast.loading("Creating category...", {
        id: "create-category",
      });
      mutate(value);
    },
    [mutate]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant={"ghost"}
            className="flex border-separate items-center justify-start rounded-none border-b px-3 py-3 text-muted-foreground"
          >
            <PlusSquare className="mr-2 h-4 w-4" />
            Create new category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create{" "}
            <span
              className={cn(
                "m-1",
                type === "income" ? "text-emerald-500" : "text-red-500"
              )}
            >
              {type}
            </span>
          </DialogTitle>
          <DialogDescription>
            Categories are used to group your transactions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is how your category will appear in the app
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              name="icon"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl>
                    <Button
                      type="button"
                      variant={"outline"}
                      className="h-[100px] w-full"
                      onClick={() => setEmojiPickerOpen(true)}
                    >
                      {form.watch("icon") ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-5xl" role="img">
                            {field.value}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Click to change
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <CircleOff className="h-[48px] w-[48px]" />
                          <p className="text-xs text-muted-foreground">
                            Click to select
                          </p>
                        </div>
                      )}
                    </Button>
                  </FormControl>
                  <FormDescription>
                    This is how your category will appear in the app
                  </FormDescription>

                  {/* Emoji Picker Dialog */}
                  <Dialog
                    open={emojiPickerOpen}
                    onOpenChange={setEmojiPickerOpen}
                  >
                    <DialogContent className="max-w-md p-0">
                      <DialogHeader className="p-4 pb-2">
                        <DialogTitle>Choose an Emoji</DialogTitle>
                      </DialogHeader>
                      <div className="p-4 pt-0">
                        <EmojiPicker
                          onEmojiClick={(emojiObject) => {
                            field.onChange(emojiObject.emoji);
                            setEmojiPickerOpen(false);
                          }}
                          theme={theme.resolvedTheme as any}
                          searchDisabled={false}
                          skinTonesDisabled={false}
                          previewConfig={{
                            showPreview: false,
                          }}
                          width="100%"
                          height={350}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant={"secondary"}
              onClick={() => {
                form.reset({
                  type: type,
                  name: "",
                  icon: "",
                });
              }}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            {!isPending && "Create"}
            {isPending && <Loader2 className="animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCategoryDialog;
