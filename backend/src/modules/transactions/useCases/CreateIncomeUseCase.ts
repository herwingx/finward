import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';

export interface CreateIncomeInput {
  userId: string;
  accountId: string;
  categoryId: string;
  amount: number;
  description: string;
  date: Date;
  recurringTransactionId?: string | null;
}

export async function createIncome(input: CreateIncomeInput) {
  const { userId, accountId, categoryId, amount, description, date } = input;
  if (amount <= 0) throw AppError.badRequest('Amount must be positive');

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) throw AppError.notFound('Account not found');

  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw AppError.notFound('Category not found');

  const isCredit = account.type === 'CREDIT';
  const amt = isCredit ? -amount : amount;

  return prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: {
        userId,
        accountId,
        categoryId,
        amount,
        description,
        date,
        type: 'income',
        recurringTransactionId: input.recurringTransactionId ?? undefined,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        accountId,
        transactionId: t.id,
        amount: amt,
        type: isCredit ? 'debit' : 'credit',
      },
    });
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: isCredit ? -amount : amount } },
    });
    return tx.transaction.findUnique({ where: { id: t.id }, include: { category: true, account: true } });
  });
}
