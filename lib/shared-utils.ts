import { SplitType, SplitConfig, UserBalance, SettlementSuggestion } from "./shared-types";

/**
 * Calculate split amounts based on split type and configuration
 */
export function calculateSplits(
    totalAmount: number,
    splitType: SplitType,
    splits: SplitConfig[]
): { userId: string; amount: number }[] {
    switch (splitType) {
        case "equal":
            const equalAmount = totalAmount / splits.length;
            return splits.map(split => ({
                userId: split.userId,
                amount: Math.round(equalAmount * 100) / 100 // Round to 2 decimal places
            }));

        case "percentage":
            return splits.map(split => ({
                userId: split.userId,
                amount: Math.round((totalAmount * (split.percentage || 0) / 100) * 100) / 100
            }));

        case "custom":
            return splits.map(split => ({
                userId: split.userId,
                amount: split.amount || 0
            }));

        case "shares":
            const totalShares = splits.reduce((sum, split) => sum + (split.shares || 0), 0);
            const amountPerShare = totalAmount / totalShares;
            return splits.map(split => ({
                userId: split.userId,
                amount: Math.round((amountPerShare * (split.shares || 0)) * 100) / 100
            }));

        default:
            throw new Error("Invalid split type");
    }
}

/**
 * Calculate net balances between users in a group
 */
export function calculateBalances(
    expenses: Array<{
        id: string;
        description: string;
        amount: number;
        date: Date;
        paidBy: string;
        splits?: Array<{
            id: string;
            userId: string;
            amount: number;
            isPaid: boolean;
        }>;
    }>,
    payments: Array<{
        id: string;
        splitId: string;
        amount: number;
    }>,
    members: { userId: string; name: string; email: string }[]
): UserBalance[] {
    // Validate inputs
    if (!expenses || !payments || !members) {
        throw new Error("Invalid input: expenses, payments, and members are required");
    }

    const balances: { [userId: string]: UserBalance } = {};

    // Initialize balances for all members
    members.forEach(member => {
        balances[member.userId] = {
            userId: member.userId,
            name: member.name,
            email: member.email,
            totalOwed: 0,    // What they owe to others
            totalOwing: 0,   // What others owe to them
            netBalance: 0,   // Positive = others owe them, Negative = they owe others
            transactions: []
        };
    });

    // Create a map of payments by splitId for faster lookup
    const paymentsBySplit = new Map<string, number>();
    payments.forEach(payment => {
        const current = paymentsBySplit.get(payment.splitId) || 0;
        paymentsBySplit.set(payment.splitId, current + payment.amount);
    });

    // Process each expense
    expenses.forEach(expense => {
        expense.splits?.forEach((split) => {
            if (!balances[split.userId]) return;

            // Amount paid towards this specific split
            const paidAmount = paymentsBySplit.get(split.id) || 0;

            // Determine if split is fully paid:
            // 1. If the split owner is the same person who paid the expense, they don't owe anything
            // 2. If there are sufficient payment records
            // 3. If split is marked as paid AND has payment records (to avoid phantom paid status)
            const isOriginalPayer = split.userId === expense.paidBy;
            const hasSufficientPayments = paidAmount >= split.amount;
            const isValidlyMarkedPaid = split.isPaid && paidAmount > 0; // Only consider paid if there are actual payments

            const isFullyPaid = isOriginalPayer || hasSufficientPayments || isValidlyMarkedPaid;

            // Calculate remaining owed amount
            let remainingOwed = 0;
            if (!isFullyPaid) {
                remainingOwed = Math.max(0, split.amount - paidAmount);
            }

            // If this person didn't pay the original expense, they owe money for their share
            if (split.userId !== expense.paidBy && remainingOwed > 0) {
                balances[split.userId].totalOwed += remainingOwed;
            }

            // The person who paid the expense is owed money from others (except their own share)
            if (expense.paidBy !== split.userId && remainingOwed > 0) {
                balances[expense.paidBy].totalOwing += remainingOwed;
            }

            // Track transaction for record keeping
            balances[split.userId].transactions.push({
                expenseId: expense.id,
                description: expense.description,
                amount: split.amount,
                isPaid: isFullyPaid,
                dueDate: expense.date
            });
        });
    });

    // Calculate net balances with proper rounding
    Object.values(balances).forEach(balance => {
        // Net balance: positive means others owe them, negative means they owe others
        balance.netBalance = Math.round((balance.totalOwing - balance.totalOwed) * 100) / 100;

        // Round other values for consistency
        balance.totalOwed = Math.round(balance.totalOwed * 100) / 100;
        balance.totalOwing = Math.round(balance.totalOwing * 100) / 100;
    });

    return Object.values(balances);
}

/**
 * Generate simple, direct settlement suggestions (person-to-person payments)
 */
export function generateSettlementSuggestions(
    balances: UserBalance[]
): SettlementSuggestion[] {
    const suggestions: SettlementSuggestion[] = [];

    // Find people who owe money (negative balance)
    const debtors = balances.filter(b => b.netBalance < -0.01);

    // Find people who should receive money (positive balance)
    const creditors = balances.filter(b => b.netBalance > 0.01);

    // For each person who owes money, create direct payment to the person they owe most to
    debtors.forEach(debtor => {
        const amountToPay = Math.abs(debtor.netBalance);

        if (amountToPay > 0.01) {
            // Find the creditor with the highest balance (simplest approach)
            const primaryCreditor = creditors.reduce((prev, current) =>
                (prev.netBalance > current.netBalance) ? prev : current
            );

            if (primaryCreditor) {
                // Get unpaid expenses that this debtor is involved in
                const relatedExpenses = debtor.transactions
                    .filter(t => !t.isPaid)
                    .map(t => t.expenseId);

                suggestions.push({
                    fromUserId: debtor.userId,
                    toUserId: primaryCreditor.userId,
                    fromUserName: debtor.name,
                    toUserName: primaryCreditor.name,
                    amount: Math.round(amountToPay * 100) / 100,
                    reason: `Direct payment for shared expenses`,
                    relatedExpenses: Array.from(new Set(relatedExpenses))
                });
            }
        }
    });

    return suggestions;
}

/**
 * Calculate group statistics
 */
export function calculateGroupStats(
    expenses: Array<{
        id: string;
        amount: number;
        category: string;
        paidBy: string;
        splits?: Array<{
            userId: string;
            amount: number;
        }>;
    }>,
    members: Array<{
        userId: string;
        isActive: boolean;
    }>
) {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalTransactions = expenses.length;
    const avgExpenseAmount = totalTransactions > 0 ? totalExpenses / totalTransactions : 0;

    const categoryBreakdown: { [category: string]: number } = {};
    expenses.forEach(expense => {
        categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
    });

    const memberContributions: { [userId: string]: { paid: number; owes: number } } = {};
    members.forEach(member => {
        memberContributions[member.userId] = { paid: 0, owes: 0 };
    });

    expenses.forEach(expense => {
        if (memberContributions[expense.paidBy]) {
            memberContributions[expense.paidBy].paid += expense.amount;
        }

        expense.splits?.forEach((split) => {
            if (memberContributions[split.userId]) {
                memberContributions[split.userId].owes += split.amount;
            }
        });
    });

    return {
        totalExpenses,
        totalTransactions,
        avgExpenseAmount,
        categoryBreakdown,
        memberContributions,
        activeMembers: members.filter(m => m.isActive).length
    };
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Generate unique invitation token
 */
export function generateInvitationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Calculate settlement deadlines based on expense dates
 */
export function calculateSettlementDeadline(expenseDate: Date, gracePeriodDays: number = 7): Date {
    const deadline = new Date(expenseDate);
    deadline.setDate(deadline.getDate() + gracePeriodDays);
    return deadline;
}

/**
 * Check if user has permission for specific action
 */
export function hasPermission(userRole: string, userPermissions: string[], requiredPermission: string): boolean {
    if (userRole === "owner") return true;
    if (userRole === "admin" && requiredPermission !== "manage_settings") return true;
    return userPermissions.includes(requiredPermission);
}

/**
 * Generate recurring expense instances
 */
export function generateRecurringInstances(
    baseExpense: {
        date: Date;
    },
    recurringConfig: {
        endDate?: Date;
        maxOccurrences?: number;
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        interval: number;
    },
    maxInstances: number = 12
): Date[] {
    const instances: Date[] = [];
    const currentDate = new Date(baseExpense.date);

    for (let i = 0; i < maxInstances; i++) {
        if (recurringConfig.endDate && currentDate > new Date(recurringConfig.endDate)) {
            break;
        }

        if (recurringConfig.maxOccurrences && i >= recurringConfig.maxOccurrences) {
            break;
        }

        instances.push(new Date(currentDate));

        // Calculate next occurrence
        switch (recurringConfig.frequency) {
            case "daily":
                currentDate.setDate(currentDate.getDate() + recurringConfig.interval);
                break;
            case "weekly":
                currentDate.setDate(currentDate.getDate() + (7 * recurringConfig.interval));
                break;
            case "monthly":
                currentDate.setMonth(currentDate.getMonth() + recurringConfig.interval);
                break;
            case "yearly":
                currentDate.setFullYear(currentDate.getFullYear() + recurringConfig.interval);
                break;
        }
    }

    return instances;
}
