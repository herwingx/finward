import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import {
  parseAndValidateAmount,
  parseAndValidateDate,
  validateDescription,
  validateUuid,
} from '../../../shared/validation';
import { createExpense } from '../../transactions/useCases/CreateExpenseUseCase';
import { createIncome } from '../../transactions/useCases/CreateIncomeUseCase';
import { calculateNextDueDate } from '../domain/nextDueDate';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

interface RecurringForPay {
  id: string;
  type: string;
  accountId: string;
  categoryId: string;
  description: string;
}

function createIncomeOrExpense(userId: string, recurring: RecurringForPay, amount: number, date: Date) {
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
  validateUuid(id, 'id');
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

  validateDescription(description);
  const validAmount = parseAndValidateAmount(amount, 'amount');

  const [category, account] = await Promise.all([
    prisma.category.findFirst({ where: { id: categoryId, userId } }),
    prisma.account.findFirst({ where: { id: accountId, userId } }),
  ]);
  if (!category) throw AppError.notFound('Category not found');
  if (!account) throw AppError.notFound('Account not found');

  const start = parseAndValidateDate(startDate, 'startDate');
  const item = await prisma.recurringTransaction.create({
    data: {
      userId,
      amount: validAmount,
      description,
      type,
      frequency,
      startDate: start,
      nextDueDate: nextDueDate ? parseAndValidateDate(nextDueDate, 'nextDueDate') : start,
      endDate: endDate ? parseAndValidateDate(endDate, 'endDate') : null,
      categoryId,
      accountId,
    },
  });
  res.status(201).json(item);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const { amount, description, type, frequency, startDate, categoryId, accountId, endDate } = req.body ?? {};

  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Recurring transaction not found');

  if (description !== undefined) validateDescription(description);
  if (categoryId !== undefined) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!cat) throw AppError.notFound('Category not found');
  }
  if (accountId !== undefined) {
    const acc = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!acc) throw AppError.notFound('Account not found');
  }

  let newNextDueDate = existing.nextDueDate;
  if (startDate || frequency) {
    newNextDueDate = startDate ? parseAndValidateDate(startDate, 'startDate') : existing.nextDueDate;
  }

  const updated = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      amount: amount !== undefined ? parseAndValidateAmount(amount, 'amount') : undefined,
      description: description ?? undefined,
      type: type ?? undefined,
      frequency: frequency ?? undefined,
      startDate: startDate ? parseAndValidateDate(startDate, 'startDate') : undefined,
      nextDueDate: newNextDueDate,
      endDate: endDate === null ? null : endDate ? parseAndValidateDate(endDate, 'endDate') : undefined,
      categoryId: categoryId ?? undefined,
      accountId: accountId ?? undefined,
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Recurring transaction not found');
  await prisma.recurringTransaction.delete({ where: { id } });
  res.status(204).send();
});

router.post('/:id/pay', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const { amount, date } = req.body ?? {};

  const recurring = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    include: { category: true, account: true },
  });
  if (!recurring) throw AppError.notFound('Recurring transaction not found');

  const payAmount = amount != null ? parseAndValidateAmount(amount, 'amount') : recurring.amount;
  const payDate = date ? parseAndValidateDate(date, 'date') : new Date(recurring.nextDueDate);

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
  validateUuid(id, 'id');

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
