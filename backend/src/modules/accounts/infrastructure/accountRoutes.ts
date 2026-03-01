import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import type { AuthRequest } from '../../../shared/types';

const router = Router();
const VALID_TYPES = ['CASH', 'DEBIT', 'CREDIT', 'LOAN', 'INVESTMENT', 'SAVINGS'];

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const accounts = await prisma.account.findMany({ where: { userId } });
  res.json(accounts);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, type, balance, creditLimit, cutoffDay, paymentDay } = req.body ?? {};
  if (!name || !type || balance === undefined) throw AppError.badRequest('Missing: name, type, balance');
  const t = type.toUpperCase();
  if (!VALID_TYPES.includes(t)) throw AppError.badRequest(`Invalid type. Use: ${VALID_TYPES.join(', ')}`);

  const account = await prisma.account.create({
    data: {
      userId,
      name,
      type: t as any,
      balance: parseFloat(balance) || 0,
      creditLimit: t === 'CREDIT' ? (creditLimit ? parseFloat(creditLimit) : null) : null,
      cutoffDay: t === 'CREDIT' ? cutoffDay ?? null : null,
      paymentDay: t === 'CREDIT' ? paymentDay ?? null : null,
    },
  });
  res.status(201).json(account);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { name, type, balance, creditLimit, cutoffDay, paymentDay } = req.body ?? {};

  const existing = await prisma.account.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Account not found');

  const update: Record<string, unknown> = {};
  if (name != null) update.name = name;
  if (type != null) {
    const t = type.toUpperCase();
    if (!VALID_TYPES.includes(t)) throw AppError.badRequest('Invalid type');
    update.type = t;
  }
  if (balance !== undefined) update.balance = parseFloat(balance);
  if (creditLimit !== undefined) update.creditLimit = creditLimit ? parseFloat(creditLimit) : null;
  if (cutoffDay !== undefined) update.cutoffDay = cutoffDay ?? null;
  if (paymentDay !== undefined) update.paymentDay = paymentDay ?? null;

  const account = await prisma.account.update({
    where: { id },
    data: update,
  });
  res.json(account);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const existing = await prisma.account.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Account not found');
  await prisma.account.delete({ where: { id } });
  res.status(204).send();
});

export default router;
