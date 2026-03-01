import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const loans = await prisma.loan.findMany({ where: { userId } });
  res.json(loans);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { borrowerName, borrowerPhone, borrowerEmail, reason, loanType, originalAmount, remainingAmount, loanDate, expectedPayDate, notes, interestRate, accountId } = req.body ?? {};
  if (!borrowerName || !originalAmount || !remainingAmount || !loanDate) {
    throw AppError.badRequest('Missing: borrowerName, originalAmount, remainingAmount, loanDate');
  }
  const loan = await prisma.loan.create({
    data: {
      userId,
      borrowerName,
      borrowerPhone,
      borrowerEmail,
      reason,
      loanType: loanType ?? 'lent',
      originalAmount: parseFloat(originalAmount),
      remainingAmount: parseFloat(remainingAmount),
      loanDate: new Date(loanDate),
      expectedPayDate: expectedPayDate ? new Date(expectedPayDate) : null,
      notes,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      accountId: accountId ?? null,
    },
  });
  res.status(201).json(loan);
});

export default router;
