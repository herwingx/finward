import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { parseSafeInt } from '../../../shared/validation';
import { addDays, addMonths, startOfMonth, endOfMonth, startOfDay } from 'date-fns';
import { getFinancialSummary } from '../useCases/GetFinancialSummaryUseCase';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

type PeriodType = 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'semestral' | 'anual';

function getPeriodDates(periodType: PeriodType, mode: 'calendar' | 'projection'): { start: Date; end: Date } {
  const now = new Date();
  const today = startOfDay(now);

  switch (periodType) {
    case 'semanal':
      return {
        start: addDays(today, -7),
        end: addDays(today, 7),
      };
    case 'quincenal':
      return mode === 'projection'
        ? { start: today, end: addDays(today, 30) }
        : { start: today, end: addDays(today, 15) };
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
  const mode = ((req.query.mode as string) || 'calendar') === 'projection' ? 'projection' : 'calendar';

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, monthlyNetIncome: true },
  });

  const { start: periodStart, end: periodEnd } = getPeriodDates(periodType, mode);

  const MAX_TX_FOR_PERIOD = 5000;
  const [accounts, transactions, recurring, loans, installments] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: periodStart, lte: periodEnd },
      },
      include: { category: true },
      take: MAX_TX_FOR_PERIOD,
      orderBy: { date: 'asc' },
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

  const summary = getFinancialSummary({
    periodStart,
    periodEnd,
    periodType,
    mode,
    liquidBalance,
    debtBalance,
    transactions: transactions.map((t) => ({
      type: t.type,
      amount: t.amount,
      date: t.date,
      category: t.category,
    })),
    recurring: recurring.map((r) => ({
      id: r.id,
      amount: r.amount,
      description: r.description,
      type: r.type,
      frequency: r.frequency,
      startDate: r.startDate,
      nextDueDate: r.nextDueDate,
      endDate: r.endDate,
      category: r.category,
    })),
    loans: loans.map((l) => ({
      id: l.id,
      remainingAmount: l.remainingAmount,
      expectedPayDate: l.expectedPayDate,
      borrowerName: l.borrowerName,
      loanType: l.loanType,
    })),
    installments: installments.map((i) => ({
      id: i.id,
      description: i.description,
      totalAmount: i.totalAmount,
      installments: i.installments,
      paidInstallments: i.paidInstallments,
      paidAmount: i.paidAmount,
      monthlyPayment: i.monthlyPayment,
      purchaseDate: i.purchaseDate,
      account: i.account,
      category: i.category,
    })),
    monthlyNetIncome: user?.monthlyNetIncome ?? null,
  });

  res.json(summary);
});

router.get('/upcoming', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const daysRaw = req.query.days != null && req.query.days !== ''
    ? parseSafeInt(req.query.days as string, 'days')
    : 7;
  const days = Math.min(Math.max(daysRaw, 1), 365);
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
  ].sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db;
  });

  res.json(upcoming);
});

export default router;
