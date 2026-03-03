import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import {
  parseAndValidateAmount,
  parseSafeInt,
  validateName,
} from '../../../shared/validation';
import { createExpense } from '../../transactions/useCases/CreateExpenseUseCase';
import { createIncome } from '../../transactions/useCases/CreateIncomeUseCase';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { priority: 'asc' },
    include: { contributions: { orderBy: { date: 'desc' }, take: 5 } },
  });
  res.json(goals);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, targetAmount, currentAmount, deadline, icon, color, priority } = req.body ?? {};
  if (!name || !targetAmount) throw AppError.badRequest('Missing: name, targetAmount');
  validateName(name);
  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name,
      targetAmount: parseAndValidateAmount(targetAmount, 'targetAmount'),
      currentAmount: currentAmount != null ? parseAndValidateAmount(currentAmount, 'currentAmount') : 0,
      deadline: deadline ? new Date(deadline) : null,
      icon,
      color,
      priority: priority ?? 1,
    },
  });
  res.status(201).json(goal);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { name, targetAmount, deadline, icon, color, priority, status } = req.body ?? {};

  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw AppError.notFound('Goal not found');

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      name: name ?? goal.name,
      targetAmount: targetAmount !== undefined ? parseAndValidateAmount(targetAmount, 'targetAmount') : goal.targetAmount,
      deadline: deadline === null ? null : deadline ? new Date(deadline) : goal.deadline,
      icon: icon ?? goal.icon,
      color: color ?? goal.color,
      priority: priority !== undefined ? parseSafeInt(priority, 'priority') : goal.priority,
      status: status ?? goal.status,
    },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw AppError.notFound('Goal not found');

  await prisma.savingsGoal.delete({ where: { id } });
  res.status(204).send();
});

router.post('/:id/contribute', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { amount, date, notes, sourceAccountId } = req.body ?? {};

  if (!amount || !sourceAccountId) throw AppError.badRequest('amount and sourceAccountId required');

  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw AppError.notFound('Goal not found');

  const amt = parseAndValidateAmount(amount, 'amount');
  let cat = await prisma.category.findFirst({ where: { userId, name: { contains: 'Ahorro', mode: 'insensitive' } } });
  if (!cat) {
    cat = await prisma.category.create({
      data: { userId, name: 'Ahorro', icon: 'savings', color: '#10B981', type: 'expense', budgetType: 'savings' },
    });
  }

  const tx = await createExpense({
    userId,
    accountId: sourceAccountId,
    categoryId: cat.id,
    amount: amt,
    description: `Ahorro: ${goal.name}`,
    date: date ? new Date(date) : new Date(),
  });
  if (!tx) throw AppError.badRequest('Failed to create transaction');

  await prisma.savingsContribution.create({
    data: {
      amount: amt,
      date: date ? new Date(date) : new Date(),
      notes: notes ?? null,
      savingsGoalId: id,
      transactionId: tx.id,
    },
  });

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: { currentAmount: { increment: amt } },
  });

  res.status(201).json({ contribution: { amount: amt }, goal: updated });
});

router.post('/:id/withdraw', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { amount, targetAccountId } = req.body ?? {};

  if (!amount || !targetAccountId) throw AppError.badRequest('amount and targetAccountId required');

  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId } });
  if (!goal) throw AppError.notFound('Goal not found');

  const withdrawAmount = parseAndValidateAmount(amount, 'amount');
  if (goal.currentAmount < withdrawAmount) throw AppError.badRequest('Insufficient funds in goal');

  let cat = await prisma.category.findFirst({
    where: { userId, name: { contains: 'Ahorro', mode: 'insensitive' }, type: 'income' },
  });
  if (!cat) {
    cat = await prisma.category.create({
      data: { userId, name: 'Retiro Ahorro', icon: 'savings', color: '#10B981', type: 'income' },
    });
  }

  await createIncome({
    userId,
    accountId: targetAccountId,
    categoryId: cat.id,
    amount: withdrawAmount,
    description: `Retiro meta: ${goal.name}`,
    date: new Date(),
  });

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: { currentAmount: { decrement: withdrawAmount } },
  });

  res.json(updated);
});

export default router;
