export type GroupRole = "owner" | "admin" | "member";

export type GroupPermission =
    | "read"
    | "write_transactions"
    | "delete_transactions"
    | "manage_categories"
    | "manage_members"
    | "manage_settings";

export type SplitType = "equal" | "percentage" | "custom" | "shares";

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export type PaymentMethod = "cash" | "venmo" | "paypal" | "bank_transfer" | "zelle" | "other";

export type GroupActivityType =
    | "group_created"
    | "member_added"
    | "member_removed"
    | "expense_added"
    | "expense_updated"
    | "expense_deleted"
    | "payment_made"
    | "settlement_made"
    | "invitation_sent"
    | "member_joined";

export interface SplitConfig {
    userId: string;
    amount?: number;      // for custom split
    percentage?: number;  // for percentage split  
    shares?: number;      // for share-based split
}

export interface RecurringConfig {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number; // every X days/weeks/months/years
    endDate?: Date;
    maxOccurrences?: number;
}

export interface UserBalance {
    userId: string;
    name: string;
    email: string;
    totalOwed: number;    // What they owe to others
    totalOwing: number;   // What others owe to them  
    netBalance: number;   // Positive = they owe you, Negative = you owe them
    transactions: {
        expenseId: string;
        description: string;
        amount: number;
        isPaid: boolean;
        dueDate?: Date;
    }[];
}

export interface SettlementSuggestion {
    fromUserId: string;
    toUserId: string;
    fromUserName: string;
    toUserName: string;
    amount: number;
    reason: string;
    relatedExpenses: string[]; // expense IDs
}

export interface GroupSummary {
    id: string;
    name: string;
    memberCount: number;
    totalExpenses: number;
    yourBalance: number;
    pendingPayments: number;
    recentActivity: number;
}

export interface ExpenseFormData {
    amount: number;
    description: string;
    category: string;
    categoryIcon: string;
    date: Date;
    paidBy: string;
    splitType: SplitType;
    splits: SplitConfig[];
    isRecurring: boolean;
    recurringConfig?: RecurringConfig;
    attachments?: File[];
}

export interface NotificationPreferences {
    expenseAdded: boolean;
    paymentReceived: boolean;
    paymentReminder: boolean;
    memberJoined: boolean;
    settlementSuggestion: boolean;
    recurringExpense: boolean;
}
