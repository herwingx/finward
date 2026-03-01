import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';

/**
 * Update transaction: revert old impact, apply new via createExpense/createTransfer/createIncome.
 * For simplicity: delete (revert) then create new with same id is complex.
 * We revert balances via LedgerEntries, update the transaction, then re-apply.
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  data: {
    amount?: number;
    description?: string;
    date?: Date;
    categoryId?: string;
    accountId?: string;
    destinationAccountId?: string;
  }
) {
  const original = await prisma.transaction.findFirst({
    where: { id: transactionId, userId, deletedAt: null },
    include: { account: true, destinationAccount: true },
  });

  if (!original) throw AppError.notFound('Transaction not found');

  if (original.installmentPurchaseId) {
    const msi = await prisma.installmentPurchase.findUnique({ where: { id: original.installmentPurchaseId } });
    if (msi && msi.paidAmount >= msi.totalAmount - 0.05) {
      throw AppError.badRequest('Cannot edit MSI payment: plan already settled');
    }
    if (original.type === 'expense') {
      throw AppError.badRequest('Edit MSI purchase in Installments section');
    }
  }

  const amount = data.amount ?? original.amount;
  const description = data.description ?? original.description;
  const date = data.date ?? original.date;
  const categoryId = data.categoryId ?? original.categoryId;
  const accountId = data.accountId ?? original.accountId;
  const destinationAccountId = data.destinationAccountId ?? original.destinationAccountId;

  return prisma.$transaction(async (db) => {
    const entries = await db.ledgerEntry.findMany({ where: { transactionId } });
    for (const e of entries) {
      await db.account.update({
        where: { id: e.accountId },
        data: { balance: { increment: -e.amount } },
      });
    }
    await db.ledgerEntry.deleteMany({ where: { transactionId } });

    if (original.installmentPurchaseId && (original.type === 'income' || original.type === 'transfer')) {
      const msi = await db.installmentPurchase.findUnique({ where: { id: original.installmentPurchaseId } });
      if (msi) {
        const installmentsRevert = Math.floor(original.amount / msi.monthlyPayment);
        await db.installmentPurchase.update({
          where: { id: original.installmentPurchaseId },
          data: {
            paidAmount: { decrement: original.amount },
            paidInstallments: { decrement: installmentsRevert },
          },
        });
      }
    }

    const updated = await db.transaction.update({
      where: { id: transactionId },
      data: {
        amount,
        description,
        date,
        categoryId: categoryId ?? undefined,
        accountId: accountId ?? undefined,
        destinationAccountId: destinationAccountId ?? undefined,
      },
    });

    const account = await db.account.findFirst({ where: { id: accountId, userId } });
    const destAccount = destinationAccountId ? await db.account.findFirst({ where: { id: destinationAccountId, userId } }) : null;

    if (updated.type === 'income' && account) {
      const amt = account.type === 'CREDIT' ? -amount : amount;
      await db.ledgerEntry.create({
        data: { accountId: account.id, transactionId, amount: amt, type: account.type === 'CREDIT' ? 'debit' : 'credit' },
      });
      await db.account.update({
        where: { id: account.id },
        data: { balance: { increment: account.type === 'CREDIT' ? -amount : amount } },
      });
    } else if (updated.type === 'expense' && account) {
      const debit = account.type === 'CREDIT' ? amount : -amount;
      if (account.type !== 'CREDIT' && account.balance < amount) {
        throw AppError.badRequest('Insufficient funds');
      }
      await db.ledgerEntry.create({
        data: { accountId: account.id, transactionId, amount: debit, type: account.type === 'CREDIT' ? 'credit' : 'debit' },
      });
      await db.account.update({
        where: { id: account.id },
        data: { balance: { increment: account.type === 'CREDIT' ? amount : -amount } },
      });
    } else if (updated.type === 'transfer' && account && destAccount) {
      if (account.type !== 'CREDIT' && account.balance < amount) throw AppError.badRequest('Insufficient funds');
      await db.ledgerEntry.createMany({
        data: [
          { accountId: account.id, transactionId, amount: -amount, type: 'debit' },
          { accountId: destAccount.id, transactionId, amount, type: 'credit' },
        ],
      });
      await db.account.update({
        where: { id: account.id },
        data: { balance: { increment: account.type === 'CREDIT' ? amount : -amount } },
      });
      await db.account.update({
        where: { id: destAccount.id },
        data: { balance: { increment: destAccount.type === 'CREDIT' ? -amount : amount } },
      });
    }

    if (updated.installmentPurchaseId && (updated.type === 'income' || updated.type === 'transfer')) {
      const msi = await db.installmentPurchase.findUnique({ where: { id: updated.installmentPurchaseId } });
      if (msi) {
        const remaining = msi.totalAmount - msi.paidAmount;
        if (amount > remaining + 0.01) throw AppError.badRequest(`Amount exceeds MSI remaining (${remaining.toFixed(2)})`);
        const installmentsAdd = Math.floor(amount / msi.monthlyPayment);
        await db.installmentPurchase.update({
          where: { id: updated.installmentPurchaseId },
          data: { paidAmount: { increment: amount }, paidInstallments: { increment: installmentsAdd } },
        });
      }
    }

    return db.transaction.findUnique({
      where: { id: transactionId },
      include: { category: true, account: true, destinationAccount: true },
    });
  });
}
