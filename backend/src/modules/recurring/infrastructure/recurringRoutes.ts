import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { createExpense } from '../../transactions/useCases/CreateExpenseUseCase';
import { createIncome } from '../../transactions/useCases/CreateIncomeUseCase';
import { calculateNextDueDate } from '../domain/nextDueDate';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

function createIncomeOrExpense(userId: string, recurring: any, amount: number, date: Date) {
  if (recurring.type === 'income') {
    return createIncome({
      userId,
      accountId: recurring.accountId,
      categoryId: recurring.categoryId,
      amount,
      description: recurring.description,
      date,
      recurringTransactionId: recurring.id,
    });
  }
  return createExpense({
    userId,
    accountId: recurring.accountId,
    categoryId: recurring.categoryId,
    amount,
    description: recurring.description,
    date,
    installmentPurchaseId: undefined,
    recurringTransactionId: recurring.id,
  });
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const items = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: { category: true, account: true },
    orderBy: { nextDueDate: 'asc' },
  });
  res.json(items);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const item = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    include: { category: true, account: true },
  });
  if (!item) throw AppError.notFound('Recurring transaction not found');
  res.json(item);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { amount, description, type, frequency, startDate, categoryId, accountId, nextDueDate, endDate } = req.body ?? {};

  if (!amount || !description || !type || !frequency || !startDate || !categoryId || !accountId) {
    throw AppError.badRequest('Missing: amount, description, type, frequency, startDate, categoryId, accountId');
  }

  const item = await prisma.recurringTransaction.create({
    data: {
      userId,
      amount: parseFloat(amount),
      description,
      type,
      frequency,
      startDate: new Date(startDate),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      categoryId,
      accountId,
    },
  });
  res.status(201).json(item);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { amount, description, type, frequency, startDate, categoryId, accountId, endDate } = req.body ?? {};

  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Recurring transaction not found');

  let newNextDueDate = existing.nextDueDate;
  if (startDate || frequency) {
    newNextDueDate = startDate ? new Date(startDate) : existing.nextDueDate;
  }

  const updated = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      description: description ?? undefined,
      type: type ?? undefined,
      frequency: frequency ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      nextDueDate: newNextDueDate,
      endDate: endDate === null ? null : endDate ? new Date(endDate) : undefined,
      categoryId: categoryId ?? undefined,
      accountId: accountId ?? undefined,
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Recurring transaction not found');
  await prisma.recurringTransaction.delete({ where: { id } });
  res.status(204).send();
});

router.post('/:id/pay', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { amount, date } = req.body ?? {};

  const recurring = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    include: { category: true, account: true },
  });
  if (!recurring) throw AppError.notFound('Recurring transaction not found');

  const payAmount = amount ? parseFloat(amount) : recurring.amount;
  const payDate = date ? new Date(date) : new Date(recurring.nextDueDate);

  const tx = await createIncomeOrExpense(userId, recurring, payAmount, payDate);

  const nextDate = calculateNextDueDate(recurring.nextDueDate, recurring.frequency);

  await prisma.recurringTransaction.update({
    where: { id },
    data: { lastRun: new Date(), nextDueDate: nextDate },
  });

  res.status(201).json(tx);
});

router.post('/:id/skip', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  const recurring = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!recurring) throw AppError.notFound('Recurring transaction not found');

  const nextDate = calculateNextDueDate(recurring.nextDueDate, recurring.frequency);

  await prisma.recurringTransaction.update({
    where: { id },
    data: { nextDueDate: nextDate },
  });

  res.json({ message: 'Skipped', nextDueDate: nextDate });
});

export default router;
