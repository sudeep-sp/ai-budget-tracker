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
    const balances: { [userId: string]: UserBalance } = {};

    // Initialize balances for all members
    members.forEach(member => {
        balances[member.userId] = {
            userId: member.userId,
            name: member.name,
            email: member.email,
            totalOwed: 0,
            totalOwing: 0,
            netBalance: 0,
            transactions: []
        };
    });

    // Calculate what each person owes from expenses
    expenses.forEach(expense => {
        expense.splits?.forEach((split) => {
            if (balances[split.userId]) {
                balances[split.userId].totalOwed += split.amount;
                balances[split.userId].transactions.push({
                    expenseId: expense.id,
                    description: expense.description,
                    amount: split.amount,
                    isPaid: split.isPaid,
                    dueDate: expense.date
                });
            }
        });

        // The person who paid is owed money by others
        if (balances[expense.paidBy]) {
            const othersOwed = expense.splits
                ?.filter((split) => split.userId !== expense.paidBy)
                ?.reduce((sum: number, split) => sum + split.amount, 0) || 0;

            balances[expense.paidBy].totalOwing += othersOwed;
        }
    });

    // Subtract payments made
    payments.forEach(payment => {
        const split = expenses
            .flatMap(e => e.splits || [])
            .find(s => s?.id === payment.splitId);

        if (split && balances[split.userId]) {
            balances[split.userId].totalOwed -= payment.amount;
        }
    });    // Calculate net balances
    Object.values(balances).forEach(balance => {
        balance.netBalance = balance.totalOwing - balance.totalOwed;
    });

    return Object.values(balances);
}

/**
 * Generate optimal settlement suggestions to minimize number of transactions
 */
export function generateSettlementSuggestions(
    balances: UserBalance[]
): SettlementSuggestion[] {
    const suggestions: SettlementSuggestion[] = [];

    // Separate creditors (positive balance) and debtors (negative balance)
    const creditors = balances.filter(b => b.netBalance > 0.01).sort((a, b) => b.netBalance - a.netBalance);
    const debtors = balances.filter(b => b.netBalance < -0.01).sort((a, b) => a.netBalance - b.netBalance);

    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
        const creditor = creditors[creditorIndex];
        const debtor = debtors[debtorIndex];

        const settleAmount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));

        if (settleAmount > 0.01) {
            suggestions.push({
                fromUserId: debtor.userId,
                toUserId: creditor.userId,
                fromUserName: debtor.name,
                toUserName: creditor.name,
                amount: Math.round(settleAmount * 100) / 100,
                reason: "Net settlement to minimize transactions",
                relatedExpenses: [
                    ...creditor.transactions.filter(t => !t.isPaid).map(t => t.expenseId),
                    ...debtor.transactions.filter(t => !t.isPaid).map(t => t.expenseId)
                ]
            });

            creditor.netBalance -= settleAmount;
            debtor.netBalance += settleAmount;
        }

        if (creditor.netBalance < 0.01) creditorIndex++;
        if (Math.abs(debtor.netBalance) < 0.01) debtorIndex++;
    }

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
