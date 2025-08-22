import z from "zod/v3";

// Group Management Schemas
export const CreateGroupSchema = z.object({
    name: z.string().min(1, "Group name is required").max(50),
    description: z.string().optional(),
    currency: z.string().min(3).max(3),
});

export type CreateGroupSchemaType = z.infer<typeof CreateGroupSchema>;

export const InviteMemberSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["member", "admin"]).default("member"),
});

export type InviteMemberSchemaType = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
    memberId: z.string(),
    role: z.enum(["member", "admin", "owner"]),
    permissions: z.array(z.string()).optional(),
});

export type UpdateMemberRoleSchemaType = z.infer<typeof UpdateMemberRoleSchema>;

// Shared Expense Schemas
export const CreateSharedExpenseSchema = z.object({
    groupId: z.string(),
    amount: z.coerce.number().positive().multipleOf(0.01),
    description: z.string().min(1, "Description is required").max(200),
    category: z.string().min(1, "Category is required"),
    categoryIcon: z.string().min(1, "Category icon is required"),
    date: z.coerce.date(),
    paidBy: z.string().min(1, "Paid by is required"),
    splitType: z.enum(["equal", "percentage", "custom", "shares"]),
    splits: z.array(z.object({
        userId: z.string(),
        amount: z.coerce.number().positive().multipleOf(0.01).optional(),
        percentage: z.coerce.number().min(0).max(100).optional(),
        shares: z.coerce.number().int().positive().optional(),
    })).min(1, "At least one split is required"),
    isRecurring: z.boolean(),
    recurringConfig: z.object({
        frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
        interval: z.coerce.number().int().positive(),
        endDate: z.coerce.date().optional(),
        maxOccurrences: z.coerce.number().int().positive().optional(),
    }).optional(),
});

export type CreateSharedExpenseSchemaType = z.infer<typeof CreateSharedExpenseSchema>;

// Payment Schemas
export const RecordPaymentSchema = z.object({
    splitId: z.string(),
    amount: z.coerce.number().positive().multipleOf(0.01),
    method: z.enum(["cash", "venmo", "paypal", "bank_transfer", "zelle", "other"]).optional(),
    notes: z.string().max(500).optional(),
    date: z.coerce.date(),
});

export type RecordPaymentSchemaType = z.infer<typeof RecordPaymentSchema>;

// Settlement Schemas  
export const CreateSettlementSchema = z.object({
    groupId: z.string(),
    fromUserId: z.string(),
    toUserId: z.string(),
    amount: z.coerce.number().positive().multipleOf(0.01),
    method: z.string().optional(),
    notes: z.string().max(500).optional(),
});

export type CreateSettlementSchemaType = z.infer<typeof CreateSettlementSchema>;

// Query Schemas
export const GroupQuerySchema = z.object({
    groupId: z.string().optional(),
    includeInactive: z.coerce.boolean().default(false),
});

export type GroupQuerySchemaType = z.infer<typeof GroupQuerySchema>;

export const ExpenseQuerySchema = z.object({
    groupId: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
    paidBy: z.string().optional(),
    category: z.string().optional(),
    isPaid: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});

export type ExpenseQuerySchemaType = z.infer<typeof ExpenseQuerySchema>;

export const BalanceQuerySchema = z.object({
    groupId: z.string().optional(),
    userId: z.string().optional(),
});

export type BalanceQuerySchemaType = z.infer<typeof BalanceQuerySchema>;

// Validation helpers
export const validateSplits = (splitType: string, splits: any[], totalAmount: number) => {
    if (!splits || splits.length === 0) {
        throw new Error("At least one split is required");
    }

    switch (splitType) {
        case "equal":
            // For equal splits, we don't need individual amounts
            return true;

        case "percentage":
            const totalPercentage = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                throw new Error("Percentages must add up to 100%");
            }
            return true;

        case "custom":
            const totalCustomAmount = splits.reduce((sum, split) => sum + (split.amount || 0), 0);
            if (Math.abs(totalCustomAmount - totalAmount) > 0.01) {
                throw new Error("Custom split amounts must add up to total expense amount");
            }
            return true;

        case "shares":
            const totalShares = splits.reduce((sum, split) => sum + (split.shares || 0), 0);
            if (totalShares === 0) {
                throw new Error("Total shares must be greater than 0");
            }
            return true;

        default:
            throw new Error("Invalid split type");
    }
};
