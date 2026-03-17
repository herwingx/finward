import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { validateAmount } from '../../../shared/validation';

/** Round to 2 decimals (avoid floating point drift in financial calculations) */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface CreateInstallmentPurchaseInput {
  userId: string;
  description: string;
  totalAmount: number;
  installments: number;
  purchaseDate: Date;
  accountId: string;
  categoryId: string;
  initialPaidInstallments?: number;
}

export async function createInstallmentPurchase(input: CreateInstallmentPurchaseInput) {
  const { userId, description, totalAmount, installments, purchaseDate, accountId, categoryId } = input;
  const initialPaid = input.initialPaidInstallments ?? 0;

  if (installments <= 0) throw AppError.badRequest('Installments must be positive');
  validateAmount(totalAmount, 'totalAmount');

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw AppError.notFound('Account not found');
  if (account.type !== 'CREDIT') throw AppError.badRequest('Installment purchases require a CREDIT account');

  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw AppError.notFound('Category not found');

  /** monthlyPayment redondeado hacia abajo; última cuota absorbe el resto para que total = totalAmount */
  const monthlyPayment = round2(Math.floor((totalAmount / installments) * 100) / 100);
  const initialPaidAmount = initialPaid > 0 ? round2(monthlyPayment * initialPaid) : 0;
  const remainingDebt = round2(Math.max(0, totalAmount - initialPaidAmount));

  return prisma.$transaction(async (tx) => {
    const purchase = await tx.installmentPurchase.create({
      data: {
        userId,
        description,
        totalAmount,
        installments,
        monthlyPayment,
        purchaseDate,
        accountId,
        categoryId,
        paidInstallments: initialPaid,
        paidAmount: initialPaidAmount,
      },
    });

    if (remainingDebt > 0) {
      const t = await tx.transaction.create({
        data: {
          userId,
          accountId,
          categoryId,
          amount: remainingDebt,
          description: description || 'Compra MSI',
          date: purchaseDate,
          type: 'expense',
          installmentPurchaseId: purchase.id,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          accountId,
          transactionId: t.id,
          amount: remainingDebt,
          type: 'credit',
        },
      });
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: remainingDebt } },
      });
    }

    return tx.installmentPurchase.findUnique({
      where: { id: purchase.id },
      include: { account: true, category: true },
    });
  });
}
