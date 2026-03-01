import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const unread = req.query.read === 'false' || req.query.read === undefined;
  const take = parseInt(req.query.take as string, 10) || 20;

  const notifications = await prisma.notification.findMany({
    where: unread ? { userId, read: false } : { userId },
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json(notifications);
});

router.put('/read-all', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  res.json({ success: true });
});

router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) throw AppError.notFound('Notification not found');

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  res.json({ success: true });
});

export default router;
