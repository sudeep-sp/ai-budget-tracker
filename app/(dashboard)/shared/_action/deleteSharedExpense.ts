"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function DeleteSharedExpense(expenseId: string) {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    try {
        // First, find the expense and check if user has permission to delete it
        const expense = await prisma.sharedExpense.findUnique({
            where: {
                id: expenseId,
            },
            include: {
                group: {
                    include: {
                        members: {
                            where: {
                                userId: user.id,
                                isActive: true,
                            },
                        },
                    },
                },
                splits: true,
                attachments: true,
            },
        });

        if (!expense) {
            throw new Error("Expense not found");
        }

        // Check if user is a member of the group
        if (!expense.group.members.length) {
            throw new Error("You don't have permission to delete this expense");
        }

        const userMember = expense.group.members[0];

        // Check if user is the one who created the expense or has admin/owner permissions
        const isExpenseCreator = expense.paidBy === user.id;
        const userRole = userMember.role;
        const hasDeletePermission = isExpenseCreator || userRole === 'admin' || userRole === 'owner';

        if (!hasDeletePermission) {
            throw new Error("You don't have permission to delete this expense");
        }

        // Delete the expense and all related records in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete expense attachments first
            if (expense.attachments.length > 0) {
                await tx.expenseAttachment.deleteMany({
                    where: {
                        expenseId: expenseId,
                    },
                });
            }

            // Delete expense splits
            await tx.expenseSplit.deleteMany({
                where: {
                    expenseId: expenseId,
                },
            });

            // Delete any payments related to this expense splits
            await tx.expensePayment.deleteMany({
                where: {
                    split: {
                        expenseId: expenseId,
                    },
                },
            });

            // Finally delete the expense itself
            await tx.sharedExpense.delete({
                where: {
                    id: expenseId,
                },
            });
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting shared expense:", error);
        throw error;
    }
}
