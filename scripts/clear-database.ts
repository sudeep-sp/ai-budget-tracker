import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function clearDatabase() {
    console.log('🗑️  Starting database cleanup...');

    try {
        // Delete in order to respect foreign key constraints

        console.log('📝 Clearing ExpensePayments...');
        await prisma.expensePayment.deleteMany({});

        console.log('📝 Clearing ExpenseSplits...');
        await prisma.expenseSplit.deleteMany({});

        console.log('📝 Clearing ExpenseAttachments...');
        await prisma.expenseAttachment.deleteMany({});

        console.log('📝 Clearing SharedExpenses...');
        await prisma.sharedExpense.deleteMany({});

        console.log('📝 Clearing GroupInvitations...');
        await prisma.groupInvitation.deleteMany({});

        console.log('📝 Clearing GroupMembers...');
        await prisma.groupMember.deleteMany({});

        console.log('📝 Clearing Settlements...');
        await prisma.settlement.deleteMany({});

        console.log('📝 Clearing GroupActivity...');
        await prisma.groupActivity.deleteMany({});

        console.log('📝 Clearing ExpenseGroups...');
        await prisma.expenseGroup.deleteMany({});

        console.log('📝 Clearing Transactions...');
        await prisma.transaction.deleteMany({});

        console.log('📝 Clearing Categories...');
        await prisma.category.deleteMany({});

        console.log('📝 Clearing MonthHistory...');
        await prisma.monthHistory.deleteMany({});

        console.log('📝 Clearing YearHistory...');
        await prisma.yearHistory.deleteMany({});

        console.log('📝 Clearing UserSettings...');
        await prisma.userSettings.deleteMany({});

        console.log('✅ Database cleared successfully!');
        console.log('🎉 You can now start fresh testing.');

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
clearDatabase()
    .then(() => {
        console.log('🎯 Database cleanup completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Database cleanup failed:', error);
        process.exit(1);
    });
