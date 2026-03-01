import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { getBillingCycle } from '../domain/billingCycle';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/statement/:accountId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const accountId = req.params.accountId as string;
  const account = await prisma.account.findFirst({ where: { id: accountId, userId, type: 'CREDIT' } });
  if (!account || !account.cutoffDay || !account.paymentDay) throw AppError.notFound('Credit card not found');

  const cycle = getBillingCycle({ cutoffDay: account.cutoffDay, paymentDay: account.paymentDay });

  const [regularPurchases, msiPurchases] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        accountId,
        type: 'expense',
        installmentPurchaseId: null,
        deletedAt: null,
        date: { gte: cycle.cycleStartDate, lte: cycle.cutoffDate },
      },
      include: { category: true },
    }),
    prisma.installmentPurchase.findMany({ where: { accountId, userId }, include: { category: true } }),
  ]);

  const regularTotal = regularPurchases.reduce((s, t) => s + t.amount, 0);
  const activeMsi = msiPurchases.filter((m) => m.paidAmount < m.totalAmount);
  const msiTotal = activeMsi.reduce((s, m) => s + m.monthlyPayment, 0);
  const totalDue = regularTotal + msiTotal;

  const payments = await prisma.transaction.findMany({
    where: { destinationAccountId: accountId, type: 'transfer', deletedAt: null, date: { gte: cycle.cycleStartDate } },
  });
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remainingDue = Math.max(0, totalDue - totalPaid);

  res.json({
    accountId,
    accountName: account.name,
    billingCycle: { ...cycle, cycleStartDate: cycle.cycleStartDate.toISOString(), cutoffDate: cycle.cutoffDate.toISOString(), paymentDate: cycle.paymentDate.toISOString() },
    regularTotal,
    msiTotal,
    totalDue,
    totalPaid,
    remainingDue,
    currentBalance: Math.abs(account.balance),
  });
});

export default router;
