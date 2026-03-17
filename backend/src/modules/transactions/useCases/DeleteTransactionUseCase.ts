import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';

export async function deleteTransaction(userId: string, transactionId: string, force?: boolean) {
  const tx = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
    include: { account: true, destinationAccount: true },
  });

  if (!tx) {
    if (force) {
      const deleted = await prisma.transaction.findFirst({
        where: { id: transactionId, userId, deletedAt: { not: null } },
      });
      if (deleted) {
        await prisma.transaction.delete({ where: { id: transactionId } });
        return { hard: true };
      }
    }
    throw AppError.notFound('Transaction not found');
  }

  if (tx.deletedAt) {
    if (force) {
      await prisma.transaction.delete({ where: { id: transactionId } });
      return { hard: true };
    }
    throw AppError.badRequest('Transaction already deleted');
  }

  if (tx.installmentPurchaseId && tx.type === 'expense') {
    throw AppError.badRequest('Delete MSI purchase from Installments section');
  }

  return prisma.$transaction(async (db) => {
    const entries = await db.ledgerEntry.findMany({ where: { transactionId } });
    const balanceDeltas = new Map<string, number>();
    for (const e of entries) {
      balanceDeltas.set(e.accountId, (balanceDeltas.get(e.accountId) ?? 0) - e.amount);
    }
    await Promise.all(
      Array.from(balanceDeltas.entries()).map(([accountId, delta]) =>
        db.account.update({
          where: { id: accountId },
          data: { balance: { increment: delta } },
        })
      )
    );
    await db.ledgerEntry.deleteMany({ where: { transactionId } });

    if (tx.installmentPurchaseId && (tx.type === 'income' || tx.type === 'transfer')) {
      const msi = await db.installmentPurchase.findUnique({ where: { id: tx.installmentPurchaseId } });
      if (msi) {
        const installmentsRevert = Math.floor(tx.amount / msi.monthlyPayment);
        await db.installmentPurchase.update({
          where: { id: tx.installmentPurchaseId },
          data: {
            paidAmount: { decrement: tx.amount },
            paidInstallments: { decrement: installmentsRevert },
          },
        });
      }
    }

    if (tx.loanId) {
      const loan = await db.loan.findUnique({ where: { id: tx.loanId } });
      if (loan) {
        const newRem = loan.remainingAmount + tx.amount;
        let st = loan.status;
        if (newRem > 0 && loan.status === 'paid') st = 'active';
        else if (newRem >= loan.originalAmount - 0.01) st = 'active';
        else if (newRem > 0) st = 'partial';
        await db.loan.update({
          where: { id: tx.loanId },
          data: { remainingAmount: newRem, status: st },
        });
      }
    }

    if (tx.recurringTransactionId) {
      await db.recurringTransaction.update({
        where: { id: tx.recurringTransactionId },
        data: { nextDueDate: tx.date },
      });
    }

    if (force) {
      await db.transaction.delete({ where: { id: transactionId } });
      return { hard: true };
    }
    await db.transaction.update({
      where: { id: transactionId },
      data: { deletedAt: new Date() },
    });
    return { soft: true };
  });
}
