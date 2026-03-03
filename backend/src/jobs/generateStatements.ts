import { prisma } from '../lib/prisma';
import { logger } from '../shared/logger';
import { startOfDay } from 'date-fns';
import { getBillingCycle } from '../modules/credit-cards/domain/billingCycle';

export async function generateCreditCardStatements(): Promise<{ processed: number; statements: string[] }> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const created: string[] = [];

  const accounts = await prisma.account.findMany({
    where: { type: 'CREDIT', cutoffDay: dayOfMonth },
    include: { installmentPurchases: true },
  });

  const BATCH_SIZE = 20;
  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (account) => {
        try {
          const cycle = getBillingCycle({ cutoffDay: account.cutoffDay!, paymentDay: account.paymentDay! }, today);
          const cycleStart = cycle.cycleStartDate;
          const cycleEnd = startOfDay(today);

          const regularAmount = (
            await prisma.transaction.aggregate({
              _sum: { amount: true },
              where: {
                accountId: account.id,
                type: 'expense',
                installmentPurchaseId: null,
                deletedAt: null,
                date: { gte: cycleStart, lte: cycleEnd },
              },
            })
          )._sum.amount ?? 0;

          const activeMsi = account.installmentPurchases.filter((m) => m.paidAmount < m.totalAmount);
          const msiAmount = activeMsi.reduce((s, m) => s + m.monthlyPayment, 0);
          const totalDue = regularAmount + msiAmount;
          const minimumPayment = Math.max(totalDue * 0.05, 200);

          const statement = await prisma.creditCardStatement.create({
            data: {
              accountId: account.id,
              cycleStart,
              cycleEnd,
              paymentDueDate: cycle.paymentDate,
              totalDue,
              minimumPayment,
              regularAmount,
              msiAmount,
              status: 'PENDING',
            },
          });
          created.push(statement.id);
        } catch (err) {
          logger.error({ err, accountId: account.id, accountName: account.name }, 'Statement job failed for account');
        }
      })
    );
  }
  return { processed: accounts.length, statements: created };
}
