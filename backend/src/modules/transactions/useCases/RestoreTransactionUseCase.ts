import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { calculateNextDueDate } from '../../recurring/domain/nextDueDate';

export async function restoreTransaction(userId: string, transactionId: string) {
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: { not: null } },
    include: { account: true, destinationAccount: true },
  });

  if (!tx) throw AppError.notFound('Deleted transaction not found');
  if (!tx.accountId || !tx.account) throw AppError.badRequest('Account no longer exists');
  if (tx.type === 'transfer' && tx.destinationAccountId && !tx.destinationAccount) {
    throw AppError.badRequest('Destination account no longer exists');
  }
  if (tx.installmentPurchaseId && tx.type === 'expense') {
    const msi = await prisma.installmentPurchase.findUnique({ where: { id: tx.installmentPurchaseId } });
    if (!msi) throw AppError.badRequest('MSI plan was deleted');
  }

  return prisma.$transaction(async (db) => {
    const entries = await db.ledgerEntry.findMany({ where: { transactionId } });
    if (entries.length === 0) {
      const account = tx.account!;
      const debit = account.type === 'CREDIT' ? tx.amount : -tx.amount;
      await db.ledgerEntry.create({
        data: {
          accountId: tx.accountId!,
          transactionId,
          amount: debit,
          type: account.type === 'CREDIT' ? 'credit' : 'debit',
        },
      });
      await db.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: account.type === 'CREDIT' ? tx.amount : -tx.amount } },
      });
      if (tx.type === 'transfer' && tx.destinationAccountId && tx.destinationAccount) {
        const dest = tx.destinationAccount;
        await db.ledgerEntry.create({
          data: {
            accountId: tx.destinationAccountId,
            transactionId,
            amount: dest.type === 'CREDIT' ? -tx.amount : tx.amount,
            type: dest.type === 'CREDIT' ? 'debit' : 'credit',
          },
        });
        await db.account.update({
          where: { id: tx.destinationAccountId },
          data: { balance: { increment: dest.type === 'CREDIT' ? -tx.amount : tx.amount } },
        });
      }
    } else {
      for (const e of entries) {
        await db.account.update({
          where: { id: e.accountId },
          data: { balance: { increment: e.amount } },
        });
      }
    }

    if (tx.installmentPurchaseId && (tx.type === 'income' || tx.type === 'transfer')) {
      const msi = await db.installmentPurchase.findUnique({ where: { id: tx.installmentPurchaseId } });
      if (msi) {
        const installmentsAdd = Math.floor(tx.amount / msi.monthlyPayment);
        await db.installmentPurchase.update({
          where: { id: tx.installmentPurchaseId },
          data: { paidAmount: { increment: tx.amount }, paidInstallments: { increment: installmentsAdd } },
        });
      }
    }

    if (tx.recurringTransactionId) {
      const rec = await db.recurringTransaction.findUnique({ where: { id: tx.recurringTransactionId } });
      if (rec) {
        const nextDate = calculateNextDueDate(tx.date, rec.frequency);
        await db.recurringTransaction.update({
          where: { id: tx.recurringTransactionId },
          data: { nextDueDate: nextDate },
        });
      }
    }

    await db.transaction.update({
      where: { id: transactionId },
      data: { deletedAt: null },
    });

    return db.transaction.findUnique({
      where: { id: transactionId },
      include: { category: true, account: true, destinationAccount: true },
    });
  });
}
