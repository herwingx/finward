import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';

export interface CreateTransferInput {
  userId: string;
  accountId: string;
  destinationAccountId: string;
  amount: number;
  description: string;
  date: Date;
  installmentPurchaseId?: string | null;
}

export async function createTransfer(input: CreateTransferInput) {
  const { userId, accountId, destinationAccountId, amount, description, date } = input;
  if (amount <= 0) throw AppError.badRequest('Amount must be positive');
  if (accountId === destinationAccountId) throw AppError.badRequest('Source and destination cannot be the same');

  const source = await prisma.account.findFirst({ where: { id: accountId, userId } });
  const dest = await prisma.account.findFirst({ where: { id: destinationAccountId, userId } });
  if (!source) throw AppError.notFound('Source account not found');
  if (!dest) throw AppError.notFound('Destination account not found');

  if (source.type !== 'CREDIT' && source.balance < amount) throw AppError.badRequest('Insufficient funds');

  return prisma.$transaction(async (tx) => {
    const t = await tx.transaction.create({
      data: { userId, accountId, destinationAccountId, amount, description, date, type: 'transfer' },
    });
    await tx.ledgerEntry.createMany({
      data: [
        { accountId, transactionId: t.id, amount: -amount, type: 'debit' },
        { accountId: destinationAccountId, transactionId: t.id, amount, type: 'credit' },
      ],
    });
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: source.type === 'CREDIT' ? amount : -amount } },
    });
    await tx.account.update({
      where: { id: destinationAccountId },
      data: { balance: { increment: dest.type === 'CREDIT' ? -amount : amount } },
    });
    return tx.transaction.findUnique({ where: { id: t.id }, include: { account: true, destinationAccount: true } });
  });
}
