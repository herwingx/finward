import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { createExpense } from '../useCases/CreateExpenseUseCase';
import { createTransfer } from '../useCases/CreateTransferUseCase';
import { createIncome } from '../useCases/CreateIncomeUseCase';
import { deleteTransaction } from '../useCases/DeleteTransactionUseCase';
import { restoreTransaction } from '../useCases/RestoreTransactionUseCase';
import { updateTransaction } from '../useCases/UpdateTransactionUseCase';
import { AppError } from '../../../shared/errors';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/deleted', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const deleted = await prisma.transaction.findMany({
    where: { userId, deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { category: true, account: true, destinationAccount: true },
  });
  res.json(deleted);
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const transactions = await prisma.transaction.findMany({
    where: { userId, deletedAt: null },
    orderBy: { date: 'desc' },
    include: { category: true, account: true, destinationAccount: true },
  });
  res.json(transactions);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const body = req.body ?? {};
  const { amount, description, date, type, categoryId, accountId, destinationAccountId, installmentPurchaseId } = body;

  if (!amount || !date || !type || !accountId) {
    throw AppError.badRequest('Missing: amount, date, type, accountId');
  }

  const amountNum = parseFloat(amount);
  const dateObj = new Date(date);

  if (type === 'transfer') {
    if (!destinationAccountId) throw AppError.badRequest('Missing destinationAccountId for transfer');
    const tx = await createTransfer({
      userId,
      accountId,
      destinationAccountId,
      amount: amountNum,
      description: description ?? 'Transfer',
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
        description: description ?? 'Income',
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
      description: description ?? 'Expense',
      date: dateObj,
      installmentPurchaseId,
    });
    res.status(201).json(tx);
    return;
  }

  throw AppError.badRequest('Invalid type: must be income, expense, or transfer');
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
  const tx = await updateTransaction(userId, id, {
    amount: amount !== undefined ? parseFloat(amount) : undefined,
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

router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const tx = await restoreTransaction(userId, id);
  res.json(tx);
});

export default router;
