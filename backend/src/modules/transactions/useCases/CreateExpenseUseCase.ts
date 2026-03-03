import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { validateAmount } from '../../../shared/validation';

export interface CreateExpenseInput {
  userId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  description: string;
  date: Date;
  installmentPurchaseId?: string | null;
  recurringTransactionId?: string | null;
}

export async function createExpense(input: CreateExpenseInput) {
  const { userId, accountId, categoryId, amount, description, date } = input;
  if (amount <= 0) throw AppError.badRequest('Amount must be positive');
  validateAmount(amount, 'amount');

  const [account, category] = await Promise.all([
    prisma.account.findFirst({ where: { id: accountId, userId } }),
    prisma.category.findFirst({ where: { id: categoryId, userId } }),
  ]);
  if (!account) throw AppError.notFound('Account not found');
  if (!category) throw AppError.notFound('Category not found');

  const isCredit = account.type === 'CREDIT';
  const debitAmount = isCredit ? amount : -amount;
  if (!isCredit && account.balance < amount) throw AppError.badRequest('Insufficient funds');

  return prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        userId,
        accountId,
        categoryId,
        amount,
        description,
        date,
        type: 'expense',
        installmentPurchaseId: input.installmentPurchaseId ?? undefined,
        recurringTransactionId: input.recurringTransactionId ?? undefined,
      },
    });
    await tx.ledgerEntry.create({
      data: { accountId, transactionId: t.id, amount: debitAmount, type: isCredit ? 'credit' : 'debit' },
    });
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: isCredit ? amount : -amount } },
    });
    return tx.transaction.findUnique({ where: { id: t.id }, include: { category: true, account: true } });
  });
}
