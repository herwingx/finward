import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { createExpense } from '../useCases/CreateExpenseUseCase';
import { createTransfer } from '../useCases/CreateTransferUseCase';
import { createIncome } from '../useCases/CreateIncomeUseCase';
import { deleteTransaction } from '../useCases/DeleteTransactionUseCase';
import { restoreTransaction } from '../useCases/RestoreTransactionUseCase';
import { updateTransaction } from '../useCases/UpdateTransactionUseCase';
import { AppError } from '../../../shared/errors';
import {
  parseAndValidateAmount,
  parsePaginationParams,
  validateDescription,
} from '../../../shared/validation';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

/** Pagination: ?take=100&skip=0 (default take=100, max take=500) */
router.get('/deleted', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { take, skip } = parsePaginationParams(req.query as { take?: string; skip?: string });
  const [deleted, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      include: { category: true, account: true, destinationAccount: true },
      take,
      skip,
    }),
    prisma.transaction.count({ where: { userId, deletedAt: { not: null } } }),
  ]);
  res.json({ data: deleted, total, take, skip });
});

/** Pagination: ?take=100&skip=0 (default take=100, max take=500) */
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { take, skip } = parsePaginationParams(req.query as { take?: string; skip?: string });
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
      include: { category: true, account: true, destinationAccount: true },
      take,
      skip,
    }),
    prisma.transaction.count({ where: { userId, deletedAt: null } }),
  ]);
  res.json({ data: transactions, total, take, skip });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const body = req.body ?? {};
  const { amount, description, date, type, categoryId, accountId, destinationAccountId, installmentPurchaseId } = body;

  if (!amount || !date || !type || !accountId) {
    throw AppError.badRequest('Missing: amount, date, type, accountId');
  }

  const amountNum = parseAndValidateAmount(amount, 'amount');
  const dateObj = new Date(date);
  const desc = (description ?? '').trim() || (type === 'transfer' ? 'Transfer' : type === 'income' ? 'Income' : 'Expense');
  validateDescription(desc);

  if (type === 'transfer') {
    if (!destinationAccountId) throw AppError.badRequest('Missing destinationAccountId for transfer');
    const tx = await createTransfer({
      userId,
      accountId,
      destinationAccountId,
      amount: amountNum,
      description: desc,
      date: dateObj,
      installmentPurchaseId,
    });
    res.status(201).json(tx);
    return;
  }

  if (type === 'expense' || type === 'income') {
    if (!categoryId) throw AppError.badRequest('Missing categoryId for income/expense');
    if (type === 'income') {
      const tx = await createIncome({
        userId,
        accountId,
        categoryId,
        amount: amountNum,
        description: desc,
        date: dateObj,
      });
      res.status(201).json(tx);
      return;
    }
    const tx = await createExpense({
      userId,
      accountId,
      categoryId,
      amount: amountNum,
      description: desc,
      date: dateObj,
      installmentPurchaseId,
    });
    res.status(201).json(tx);
    return;
  }

  throw AppError.badRequest('Invalid type: must be income, expense, or transfer');
});

// Move specific routes BEFORE generic ones
router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const tx = await restoreTransaction(userId, id);
  res.json(tx);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const tx = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: true, account: true, destinationAccount: true },
  });
  if (!tx) throw AppError.notFound('Transaction not found');
  res.json(tx);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { amount, description, date, categoryId, accountId, destinationAccountId } = req.body ?? {};
  if (description !== undefined) validateDescription(description);
  const tx = await updateTransaction(userId, id, {
    amount: amount !== undefined ? parseAndValidateAmount(amount, 'amount') : undefined,
    description: description ?? undefined,
    date: date ? new Date(date) : undefined,
    categoryId: categoryId ?? undefined,
    accountId: accountId ?? undefined,
    destinationAccountId: destinationAccountId ?? undefined,
  });
  res.json(tx);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const force = req.query.force === 'true';
  await deleteTransaction(userId, id, force);
  res.status(204).send();
});

export default router;
