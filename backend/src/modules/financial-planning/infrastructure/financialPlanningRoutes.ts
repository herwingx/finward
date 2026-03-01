import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { addDays, addMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

type PeriodType = 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'semestral' | 'anual';

function getPeriodDates(periodType: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);

  switch (periodType) {
    case 'semanal':
      return {
        start: addDays(today, -7),
        end: addDays(today, 7),
      };
    case 'quincenal':
      return {
        start: today,
        end: addDays(today, 15),
      };
    case 'mensual':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case 'bimestral':
      return {
        start: startOfMonth(now),
        end: endOfMonth(addMonths(now, 1)),
      };
    case 'semestral':
      return {
        start: startOfMonth(now),
        end: endOfMonth(addMonths(now, 5)),
      };
    case 'anual':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    default:
      return {
        start: today,
        end: addDays(today, 15),
      };
  }
}

router.get('/summary', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const periodType = (req.query.period as PeriodType) || 'quincenal';

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, monthlyNetIncome: true },
  });

  const { start: periodStart, end: periodEnd } = getPeriodDates(periodType);

  const [accounts, transactions, recurring, loans, installments] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: periodStart, lte: periodEnd },
      },
      include: { category: true },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, active: true },
      include: { category: true, account: true },
    }),
    prisma.loan.findMany({
      where: {
        userId,
        status: { in: ['active', 'partial'] },
        expectedPayDate: { gte: periodStart, lte: periodEnd },
      },
    }),
    prisma.installmentPurchase.findMany({
      where: { userId, status: 'active' },
      include: { category: true, account: true },
    }),
  ]);

  const liquidBalance = accounts
    .filter((a) => !['CREDIT', 'LOAN'].includes(a.type))
    .reduce((s, a) => s + a.balance, 0);

  const debtBalance = accounts
    .filter((a) => ['CREDIT', 'LOAN'].includes(a.type))
    .reduce((s, a) => s + Math.abs(a.balance), 0);

  const incomeTotal = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const expenseTotal = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const expectedRecurring = recurring.reduce((acc, r) => {
    const amt = r.amount;
    if (r.type === 'income') acc.income += amt;
    else acc.expense += amt;
    return acc;
  }, { income: 0, expense: 0 });

  res.json({
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodType,
    currentBalance: liquidBalance,
    currentDebt: debtBalance,
    incomeTotal,
    expenseTotal,
    expectedRecurringIncome: expectedRecurring.income,
    expectedRecurringExpense: expectedRecurring.expense,
    activeLoans: loans.length,
    activeInstallments: installments.length,
    monthlyNetIncome: user?.monthlyNetIncome ?? null,
  });
});

router.get('/upcoming', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const days = parseInt(req.query.days as string, 10) || 7;
  const now = new Date();
  const endDate = addDays(now, days);

  const [recurring, loans] = await Promise.all([
    prisma.recurringTransaction.findMany({
      where: {
        userId,
        active: true,
        nextDueDate: { gte: now, lte: endDate },
      },
      include: { category: true },
    }),
    prisma.loan.findMany({
      where: {
        userId,
        status: { in: ['active', 'partial'] },
        expectedPayDate: { gte: now, lte: endDate },
      },
    }),
  ]);

  const upcoming = [
    ...recurring.map((r) => ({
      id: r.id,
      type: 'recurring' as const,
      description: r.description,
      amount: r.amount,
      dueDate: r.nextDueDate,
      category: r.category,
    })),
    ...loans.map((l) => ({
      id: l.id,
      type: 'loan' as const,
      description: `Préstamo: ${l.borrowerName}`,
      amount: l.remainingAmount,
      dueDate: l.expectedPayDate,
    })),
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  res.json(upcoming);
});

export default router;
