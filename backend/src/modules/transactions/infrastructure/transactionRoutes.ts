import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { createExpense } from '../useCases/CreateExpenseUseCase';
import { createTransfer } from '../useCases/CreateTransferUseCase';
import { AppError } from '../../../shared/errors';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

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
      const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
      if (!account) throw AppError.notFound('Account not found');
      const tx = await prisma.$transaction(async (db) => {
        const t = await db.transaction.create({
          data: {
            userId,
            accountId,
            categoryId,
            amount: amountNum,
            description: description ?? 'Income',
            date: dateObj,
            type: 'income',
          },
        });
        const amt = account.type === 'CREDIT' ? -amountNum : amountNum;
        await db.ledgerEntry.create({
          data: {
            accountId,
            transactionId: t.id,
            amount: amt,
            type: account.type === 'CREDIT' ? 'debit' : 'credit',
          },
        });
        await db.account.update({
          where: { id: accountId },
          data: { balance: { increment: account.type === 'CREDIT' ? -amountNum : amountNum } },
        });
        return db.transaction.findUnique({
          where: { id: t.id },
          include: { category: true, account: true },
        });
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

export default router;
