import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import {
  parseSafeFloat,
  validateAmount,
  validateName,
} from '../../../shared/validation';
import type { AuthRequest } from '../../../shared/types';

const router = Router();
const VALID_TYPES = ['CASH', 'DEBIT', 'CREDIT', 'LOAN', 'INVESTMENT', 'SAVINGS'] as const;

/**
 * Balance is NEVER editable via API - it's derived from LedgerEntry.
 * Use transaction endpoints to change balances.
 * @see backend/docs/SECURITY.md
 */

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const accounts = await prisma.account.findMany({ where: { userId } });
  res.json(accounts);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, type, balance, creditLimit, cutoffDay, paymentDay } = req.body ?? {};
  if (!name || !type || balance === undefined) throw AppError.badRequest('Missing: name, type, balance');

  validateName(name);
  const t = String(type).toUpperCase();
  if (!VALID_TYPES.includes(t as (typeof VALID_TYPES)[number])) {
    throw AppError.badRequest(`Invalid type. Use: ${VALID_TYPES.join(', ')}`);
  }

  const initialBalance = parseSafeFloat(balance, 'balance');
  validateAmount(Math.abs(initialBalance), 'balance');

  const account = await prisma.account.create({
    data: {
      userId,
      name,
      type: t as 'CASH' | 'DEBIT' | 'CREDIT' | 'LOAN' | 'INVESTMENT' | 'SAVINGS',
      balance: initialBalance,
      creditLimit: t === 'CREDIT' && creditLimit != null ? parseSafeFloat(creditLimit, 'creditLimit') : null,
      cutoffDay: t === 'CREDIT' ? (cutoffDay != null ? parseSafeFloat(cutoffDay, 'cutoffDay') : null) : null,
      paymentDay: t === 'CREDIT' ? (paymentDay != null ? parseSafeFloat(paymentDay, 'paymentDay') : null) : null,
    },
  });
  res.status(201).json(account);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  const { name, type, creditLimit, cutoffDay, paymentDay } = req.body ?? {};

  const existing = await prisma.account.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Account not found');

  const update: Record<string, unknown> = {};
  if (name != null) {
    validateName(name);
    update.name = name;
  }
  if (type != null) {
    const t = String(type).toUpperCase();
    if (!VALID_TYPES.includes(t as (typeof VALID_TYPES)[number])) throw AppError.badRequest('Invalid type');
    update.type = t;
  }
  // Balance is intentionally NOT updatable - derived from LedgerEntry only
  if (creditLimit !== undefined) {
    update.creditLimit = creditLimit != null ? parseSafeFloat(creditLimit, 'creditLimit') : null;
    if (update.creditLimit != null) validateAmount(update.creditLimit as number, 'creditLimit');
  }
  if (cutoffDay !== undefined) update.cutoffDay = cutoffDay != null ? parseSafeFloat(cutoffDay, 'cutoffDay') : null;
  if (paymentDay !== undefined) update.paymentDay = paymentDay != null ? parseSafeFloat(paymentDay, 'paymentDay') : null;

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
