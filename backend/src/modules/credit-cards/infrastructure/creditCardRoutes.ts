import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { parseAndValidateAmount } from '../../../shared/validation';
import { getBillingCycle } from '../domain/billingCycle';
import { getMsiAmountForBillingCycle } from '../domain/msiForStatement';
import { createTransfer } from '../../transactions/useCases/CreateTransferUseCase';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/statement/:accountId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const accountId = req.params.accountId as string;
  const account = await prisma.account.findFirst({ where: { id: accountId, userId, type: 'CREDIT' } });
  if (!account || !account.cutoffDay || account.daysToPayAfterCutoff == null) throw AppError.notFound('Credit card not found');

  const cycle = getBillingCycle({ cutoffDay: account.cutoffDay, daysToPayAfterCutoff: account.daysToPayAfterCutoff });

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
    prisma.installmentPurchase.findMany({
      where: { accountId, userId },
      include: { category: true, account: { select: { cutoffDay: true, daysToPayAfterCutoff: true } } },
    }),
  ]);

  const regularTotal = regularPurchases.reduce((s, t) => s + t.amount, 0);
  const msiTotal = getMsiAmountForBillingCycle(msiPurchases, cycle);
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

router.post('/statement/:accountId/pay', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const accountId = req.params.accountId as string;
  const { sourceAccountId, amount, date } = req.body ?? {};

  if (!sourceAccountId || !amount) throw AppError.badRequest('Missing sourceAccountId or amount');

  const account = await prisma.account.findFirst({ where: { id: accountId, userId, type: 'CREDIT' } });
  if (!account || !account.cutoffDay || account.daysToPayAfterCutoff == null) throw AppError.notFound('Credit card not found');

  const sourceAccount = await prisma.account.findFirst({ where: { id: sourceAccountId, userId } });
  if (!sourceAccount) throw AppError.notFound('Source account not found');

  const payAmount = parseAndValidateAmount(amount, 'amount');
  const payDate = date ? new Date(date) : new Date();

  const tx = await createTransfer({
    userId,
    accountId: sourceAccountId,
    destinationAccountId: accountId,
    amount: payAmount,
    description: `Pago tarjeta: ${account.name}`,
    date: payDate,
  });
  res.status(201).json(tx);
});

router.post('/msi/:installmentId/pay', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const installmentId = req.params.installmentId as string;
  const { sourceAccountId, date } = req.body ?? {};

  if (!sourceAccountId) throw AppError.badRequest('Missing sourceAccountId');

  const msi = await prisma.installmentPurchase.findFirst({
    where: { id: installmentId, userId },
    include: { account: true },
  });
  if (!msi) throw AppError.notFound('Installment purchase not found');
  if (msi.paidAmount >= msi.totalAmount) throw AppError.badRequest('Installment already fully paid');

  const sourceAccount = await prisma.account.findFirst({ where: { id: sourceAccountId, userId } });
  if (!sourceAccount) throw AppError.notFound('Source account not found');

  const payDate = date ? new Date(date) : new Date();
  const isLastInstallment = msi.paidInstallments + 1 === msi.installments;
  const payAmount = isLastInstallment
    ? Math.round((msi.totalAmount - msi.paidAmount) * 100) / 100
    : msi.monthlyPayment;

  const tx = await createTransfer({
    userId,
    accountId: sourceAccountId,
    destinationAccountId: msi.accountId,
    amount: payAmount,
    description: `Pago MSI: ${msi.description} (${msi.paidInstallments + 1}/${msi.installments})`,
    date: payDate,
    installmentPurchaseId: msi.id,
  });

  await prisma.installmentPurchase.update({
    where: { id: installmentId },
    data: {
      paidAmount: { increment: payAmount },
      paidInstallments: { increment: 1 },
      status: msi.paidAmount + payAmount >= msi.totalAmount ? 'completed' : undefined,
    },
  });

  res.status(201).json(tx);
});

router.post('/revert/:transactionId', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const transactionId = req.params.transactionId as string;

  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, type: 'transfer', destinationAccountId: { not: null } },
    include: { account: true, destinationAccount: true },
  });
  if (!tx) throw AppError.notFound('Payment transaction not found');
  if (tx.destinationAccount?.type !== 'CREDIT') throw AppError.badRequest('Not a credit card payment');

  const { deleteTransaction } = await import('../../transactions/useCases/DeleteTransactionUseCase');
  await deleteTransaction(userId, transactionId, false);
  res.json({ success: true, message: 'Payment reverted', amountReverted: tx.amount });
});

export default router;
