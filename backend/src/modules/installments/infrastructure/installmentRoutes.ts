import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import {
  parseAndValidateAmount,
  parseAndValidateDate,
  parseSafeFloat,
  parseSafeInt,
  validateDescription,
  validateUuid,
} from '../../../shared/validation';
import { createInstallmentPurchase } from '../useCases/CreateInstallmentPurchaseUseCase';
import { payInstallment } from '../useCases/PayInstallmentUseCase';
import { getNextPaymentDate } from '../domain/nextPaymentDate';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const purchases = await prisma.installmentPurchase.findMany({
    where: { userId },
    include: { account: true, category: true },
    orderBy: { purchaseDate: 'desc' },
  });

  const withNextPayment = purchases.map((p) => ({
    ...p,
    nextPaymentDate: getNextPaymentDate(p),
  }));
  res.json(withNextPayment);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const purchase = await prisma.installmentPurchase.findFirst({
    where: { id, userId },
    include: { account: true, category: true },
  });
  if (!purchase) throw AppError.notFound('Installment purchase not found');
  res.json({
    ...purchase,
    nextPaymentDate: getNextPaymentDate(purchase),
  });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { description, totalAmount, installments, purchaseDate, accountId, categoryId, initialPaidInstallments } =
    req.body ?? {};

  if (!description || !totalAmount || !installments || !purchaseDate || !accountId || !categoryId) {
    throw AppError.badRequest('Missing: description, totalAmount, installments, purchaseDate, accountId, categoryId');
  }

  validateDescription(description);
  const purchase = await createInstallmentPurchase({
    userId,
    description,
    totalAmount: parseAndValidateAmount(totalAmount, 'totalAmount'),
    installments: parseSafeInt(installments, 'installments'),
    purchaseDate: parseAndValidateDate(purchaseDate, 'purchaseDate'),
    accountId,
    categoryId,
    initialPaidInstallments: initialPaidInstallments != null ? parseSafeInt(initialPaidInstallments, 'initialPaidInstallments') : undefined,
  });
  res.status(201).json(purchase);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const { description, totalAmount, installments, purchaseDate, categoryId } = req.body ?? {};

  const purchase = await prisma.installmentPurchase.findFirst({ where: { id, userId }, include: { account: true } });
  if (!purchase) throw AppError.notFound('Installment purchase not found');

  if (description !== undefined) validateDescription(description);
  if (categoryId !== undefined) {
    const cat = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!cat) throw AppError.notFound('Category not found');
  }

  const newTotal = totalAmount != null ? parseAndValidateAmount(totalAmount, 'totalAmount') : purchase.totalAmount;
  const newInstallments = installments != null ? parseSafeInt(installments, 'installments') : purchase.installments;
  if (newInstallments < 1) throw AppError.badRequest('installments must be at least 1');
  const currentPaid = purchase.paidAmount;
  if (currentPaid > 0 && newTotal < currentPaid - 0.01) {
    throw AppError.badRequest('Cannot reduce total below paid amount');
  }
  const newMonthlyPayment = Math.floor((newTotal / newInstallments) * 100) / 100;
  let recalcPaid = purchase.paidInstallments;
  if (currentPaid > 0 && (totalAmount !== undefined || installments !== undefined)) {
    recalcPaid = Math.min(newInstallments, Math.floor(currentPaid / newMonthlyPayment));
  }

  const updated = await prisma.installmentPurchase.update({
    where: { id },
    data: {
      description: description ?? purchase.description,
      totalAmount: newTotal,
      installments: newInstallments,
      monthlyPayment: newMonthlyPayment,
      paidInstallments: recalcPaid,
      purchaseDate: purchaseDate ? parseAndValidateDate(purchaseDate, 'purchaseDate') : purchase.purchaseDate,
      categoryId: categoryId ?? purchase.categoryId,
    },
    include: { account: true, category: true },
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const revert = req.query.revert === 'true';

  const purchase = await prisma.installmentPurchase.findFirst({
    where: { id, userId },
    include: { account: true },
  });
  if (!purchase) throw AppError.notFound('Installment purchase not found');

  await prisma.$transaction(async (db) => {
    const txs = await db.transaction.findMany({
      where: { installmentPurchaseId: id, deletedAt: null },
      include: { account: true },
    });
    const entries = await db.ledgerEntry.findMany({
      where: { transactionId: { in: txs.map((t) => t.id) } },
    });

    const balanceDeltas = new Map<string, number>();
    for (const e of entries) {
      balanceDeltas.set(e.accountId, (balanceDeltas.get(e.accountId) ?? 0) - e.amount);
    }
    if (revert) {
      for (const tr of txs) {
        if (tr.type === 'transfer' && tr.accountId && tr.destinationAccountId === purchase.accountId && tr.account) {
          const amt = tr.amount;
          const delta = tr.account.type === 'CREDIT' ? -amt : amt;
          balanceDeltas.set(tr.accountId, (balanceDeltas.get(tr.accountId) ?? 0) + delta);
        }
      }
    }

    for (const [accountId, delta] of balanceDeltas) {
      if (delta !== 0) {
        await db.account.update({
          where: { id: accountId },
          data: { balance: { increment: delta } },
        });
      }
    }

    await db.ledgerEntry.deleteMany({ where: { transactionId: { in: txs.map((t) => t.id) } } });
    await db.transaction.deleteMany({ where: { installmentPurchaseId: id } });
    await db.installmentPurchase.delete({ where: { id } });
  });
  res.status(204).send();
});

router.post('/:id/pay', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const { amount, date, accountId, description } = req.body ?? {};

  if (!amount || !date || !accountId) {
    throw AppError.badRequest('Missing: amount, date, accountId');
  }

  const tx = await payInstallment({
    userId,
    installmentPurchaseId: id,
    amount: parseAndValidateAmount(amount, 'amount'),
    date: parseAndValidateDate(date, 'date'),
    sourceAccountId: accountId,
    description,
  });
  res.status(201).json(tx);
});

export default router;
