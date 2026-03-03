import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { parseSafeInt } from '../../../shared/validation';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const unread = req.query.read === 'false' || req.query.read === undefined;
  const takeRaw = req.query.take != null && req.query.take !== ''
    ? parseSafeInt(req.query.take as string, 'take')
    : 20;
  const take = Math.min(Math.max(takeRaw, 1), 100);

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

router.post('/debug-trigger', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: 'DEBUG',
      title: '🚀 Prueba Realtime',
      body: 'Si ves esto, tu conexión por WebSockets de Supabase está funcionando perfectamente.',
      data: { timestamp: new Date().toISOString() },
    },
  });

  res.json(notification);
});

export default router;
