import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const goals = await prisma.savingsGoal.findMany({ where: { userId } });
  res.json(goals);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, targetAmount, currentAmount, deadline, icon, color, priority } = req.body ?? {};
  if (!name || !targetAmount) throw AppError.badRequest('Missing: name, targetAmount');
  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) ?? 0,
      deadline: deadline ? new Date(deadline) : null,
      icon,
      color,
      priority: priority ?? 1,
    },
  });
  res.status(201).json(goal);
});

export default router;
