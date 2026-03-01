import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { createTransfer } from '../../transactions/useCases/CreateTransferUseCase';

export interface PayInstallmentInput {
  userId: string;
  installmentPurchaseId: string;
  amount: number;
  date: Date;
  sourceAccountId: string;
  description?: string;
}

export async function payInstallment(input: PayInstallmentInput) {
  const { userId, installmentPurchaseId, amount, date, sourceAccountId } = input;

  const purchase = await prisma.installmentPurchase.findFirst({
    where: { id: installmentPurchaseId, userId },
    include: { account: true },
  });

  if (!purchase) throw AppError.notFound('Installment purchase not found');
  if (purchase.paidAmount >= purchase.totalAmount) throw AppError.badRequest('Purchase already fully paid');

  const remaining = purchase.totalAmount - purchase.paidAmount;
  if (amount > remaining) {
    throw AppError.badRequest(`Amount exceeds remaining balance (${remaining.toFixed(2)})`);
  }

  const installmentsCovered = Math.floor(amount / purchase.monthlyPayment);
  const newPaidInstallments = Math.min(
    purchase.installments,
    purchase.paidInstallments + (installmentsCovered > 0 ? installmentsCovered : 1)
  );

  const tx = await createTransfer({
    userId,
    accountId: sourceAccountId,
    destinationAccountId: purchase.accountId,
    amount,
    description: input.description ?? `Pago MSI: ${purchase.description}`,
    date,
    installmentPurchaseId: purchase.id,
  });

  await prisma.installmentPurchase.update({
    where: { id: purchase.id },
    data: {
      paidAmount: { increment: amount },
      paidInstallments: newPaidInstallments,
      status: purchase.paidAmount + amount >= purchase.totalAmount ? 'completed' : undefined,
    },
  });

  return tx;
}
