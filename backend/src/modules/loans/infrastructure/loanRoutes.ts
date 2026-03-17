import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import {
  parseAndValidateAmount,
  parseAndValidateDate,
  parseSafeFloat,
  validateMaxLength,
  validateUuid,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
} from '../../../shared/validation';
import { createExpense } from '../../transactions/useCases/CreateExpenseUseCase';
import { createIncome } from '../../transactions/useCases/CreateIncomeUseCase';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/summary', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const loans = await prisma.loan.findMany({ where: { userId } });
  const active = loans.filter((l) => l.status === 'active' || l.status === 'partial');
  const lent = active.filter((l) => l.loanType === 'lent');
  const borrowed = active.filter((l) => l.loanType === 'borrowed');
  res.json({
    totalLoans: loans.length,
    activeLoansCount: active.length,
    paidLoansCount: loans.filter((l) => l.status === 'paid').length,
    totalOwedToMe: lent.reduce((s, l) => s + l.remainingAmount, 0),
    lentLoansCount: lent.length,
    totalIOwe: borrowed.reduce((s, l) => s + l.remainingAmount, 0),
    borrowedLoansCount: borrowed.length,
    netBalance: lent.reduce((s, l) => s + l.remainingAmount, 0) - borrowed.reduce((s, l) => s + l.remainingAmount, 0),
    totalRecovered: loans.reduce((s, l) => s + (l.originalAmount - l.remainingAmount), 0),
  });
});

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const loans = await prisma.loan.findMany({
    where: { userId },
    include: { account: true },
    orderBy: [{ status: 'asc' }, { expectedPayDate: 'asc' }, { loanDate: 'desc' }],
  });
  res.json(loans);
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const loan = await prisma.loan.findFirst({ where: { id, userId }, include: { account: true } });
  if (!loan) throw AppError.notFound('Loan not found');
  res.json(loan);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { borrowerName, borrowerPhone, borrowerEmail, reason, loanType, originalAmount, remainingAmount, loanDate, expectedPayDate, notes, interestRate, accountId } = req.body ?? {};
  if (!borrowerName || !originalAmount || !loanDate) {
    throw AppError.badRequest('Missing: borrowerName, originalAmount, loanDate');
  }
  validateMaxLength(borrowerName, MAX_NAME_LENGTH, 'borrowerName');
  validateMaxLength(notes, MAX_NOTES_LENGTH, 'notes');
  if (accountId != null) {
    const acc = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!acc) throw AppError.notFound('Account not found');
  }
  const parsedOriginalAmount = parseAndValidateAmount(originalAmount, 'originalAmount');
  const parsedRemainingAmount = remainingAmount != null
    ? parseAndValidateAmount(remainingAmount, 'remainingAmount')
    : parsedOriginalAmount;

  const loan = await prisma.loan.create({
    data: {
      userId,
      borrowerName,
      borrowerPhone,
      borrowerEmail,
      reason,
      loanType: loanType ?? 'lent',
      originalAmount: parsedOriginalAmount,
      remainingAmount: parsedRemainingAmount,
      loanDate: parseAndValidateDate(loanDate, 'loanDate'),
      expectedPayDate: expectedPayDate ? parseAndValidateDate(expectedPayDate, 'expectedPayDate') : null,
      notes,
      interestRate: interestRate != null ? parseSafeFloat(interestRate, 'interestRate') : null,
      accountId: accountId ?? null,
    },
  });
  res.status(201).json(loan);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const { borrowerName, borrowerPhone, borrowerEmail, reason, expectedPayDate, notes, originalAmount, accountId } =
    req.body ?? {};

  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) throw AppError.notFound('Loan not found');

  if (accountId !== undefined && accountId != null) {
    const acc = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!acc) throw AppError.notFound('Account not found');
  }

  const newOriginal = originalAmount !== undefined ? parseAndValidateAmount(originalAmount, 'originalAmount') : loan.originalAmount;
  let newRemaining = loan.remainingAmount;
  if (originalAmount !== undefined && originalAmount !== loan.originalAmount) {
    const paid = loan.originalAmount - loan.remainingAmount;
    newRemaining = Math.max(0, newOriginal - paid);
  }

  const updated = await prisma.loan.update({
    where: { id },
    data: {
      borrowerName: borrowerName ?? loan.borrowerName,
      borrowerPhone: borrowerPhone ?? loan.borrowerPhone,
      borrowerEmail: borrowerEmail ?? loan.borrowerEmail,
      reason: reason ?? loan.reason,
      expectedPayDate: expectedPayDate === null ? null : expectedPayDate ? parseAndValidateDate(expectedPayDate, 'expectedPayDate') : loan.expectedPayDate,
      notes: notes ?? loan.notes,
      originalAmount: newOriginal,
      remainingAmount: newRemaining,
      accountId: accountId ?? loan.accountId,
    },
    include: { account: true },
  });
  res.json(updated);
});

router.post('/:id/payment', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');
  const { amount, paymentDate, notes, accountId } = req.body ?? {};

  if (!amount) throw AppError.badRequest('Amount required');

  const loan = await prisma.loan.findFirst({ where: { id, userId }, include: { account: true } });
  if (!loan) throw AppError.notFound('Loan not found');
  if (loan.status === 'paid') throw AppError.badRequest('Loan already paid');

  const payAmount = parseAndValidateAmount(amount, 'amount');
  const payDate = paymentDate ? parseAndValidateDate(paymentDate, 'paymentDate') : new Date();
  const newRemaining = Math.max(0, loan.remainingAmount - payAmount);
  const status = newRemaining <= 0 ? 'paid' : newRemaining < loan.originalAmount - 0.01 ? 'partial' : 'active';

  let cat = await prisma.category.findFirst({ where: { userId, name: { contains: 'Préstamo', mode: 'insensitive' } } });
  if (!cat) {
    cat = await prisma.category.create({
      data: { userId, name: 'Préstamos', icon: 'credit_score', color: '#f59e0b', type: 'expense', budgetType: 'need' },
    });
  }

  const targetAccId = accountId ?? loan.accountId;
  if (!targetAccId) throw AppError.badRequest('accountId required for loan payment');

  const tx = loan.loanType === 'lent'
    ? await createIncome({
        userId,
        accountId: targetAccId,
        categoryId: cat.id,
        amount: payAmount,
        description: `Cobro préstamo: ${loan.borrowerName}`,
        date: payDate,
      })
    : await createExpense({
        userId,
        accountId: targetAccId,
        categoryId: cat.id,
        amount: payAmount,
        description: `Pago préstamo: ${loan.borrowerName}`,
        date: payDate,
      });
  if (!tx) throw AppError.badRequest('Failed to create payment transaction');

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { loanId: id },
  });

  await prisma.loan.update({
    where: { id },
    data: { remainingAmount: newRemaining, status },
  });

  res.status(201).json(await prisma.transaction.findUnique({
    where: { id: tx.id },
    include: { category: true, account: true },
  }));
});

router.post('/:id/mark-paid', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');

  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) throw AppError.notFound('Loan not found');

  await prisma.loan.update({
    where: { id },
    data: { remainingAmount: 0, status: 'paid' },
  });
  res.json({ message: 'Loan marked as paid' });
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const id = req.params.id as string;
  validateUuid(id, 'id');

  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) throw AppError.notFound('Loan not found');

  await prisma.loan.delete({ where: { id } });
  res.status(204).send();
});

export default router;
