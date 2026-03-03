import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../shared/errors';
import { validateAmount } from '../../../shared/validation';

/**
 * Update transaction: revert old impact, apply new via LedgerEntries.
 * Validates account ownership BEFORE revert to prevent financial bypass
 * (reverting without valid re-application would allow balance manipulation).
 * @see backend/docs/SECURITY.md - IDOR prevention
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
  const accountId = data.accountId ?? original.accountId ?? null;
  const destinationAccountId = data.destinationAccountId ?? original.destinationAccountId ?? null;

  validateAmount(amount, 'amount');

  const account = await prisma.account.findFirst({ where: { id: accountId!, userId } });
  const destAccount = destinationAccountId
    ? await prisma.account.findFirst({ where: { id: destinationAccountId, userId } })
    : null;

  const needsAccount = original.type === 'income' || original.type === 'expense';
  const needsBothAccounts = original.type === 'transfer';
  if (needsAccount && !account) {
    throw AppError.badRequest('Account not found or does not belong to you');
  }
  if (needsBothAccounts) {
    if (!account || !destAccount) {
      throw AppError.badRequest('Source or destination account not found or does not belong to you');
    }
    if (account.id === destAccount.id) {
      throw AppError.badRequest('Source and destination cannot be the same');
    }
  }

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

    const accountRes = accountId ? await db.account.findFirst({ where: { id: accountId, userId } }) : null;
    const destAccountRes = destinationAccountId ? await db.account.findFirst({ where: { id: destinationAccountId, userId } }) : null;

    if (updated.type === 'income' && accountRes) {
      const amt = accountRes.type === 'CREDIT' ? -amount : amount;
      await db.ledgerEntry.create({
        data: { accountId: accountRes.id, transactionId, amount: amt, type: accountRes.type === 'CREDIT' ? 'debit' : 'credit' },
      });
      await db.account.update({
        where: { id: accountRes.id },
        data: { balance: { increment: accountRes.type === 'CREDIT' ? -amount : amount } },
      });
    } else if (updated.type === 'expense' && accountRes) {
      const debit = accountRes.type === 'CREDIT' ? amount : -amount;
      if (accountRes.type !== 'CREDIT' && accountRes.balance < amount) {
        throw AppError.badRequest('Insufficient funds');
      }
      await db.ledgerEntry.create({
        data: { accountId: accountRes.id, transactionId, amount: debit, type: accountRes.type === 'CREDIT' ? 'credit' : 'debit' },
      });
      await db.account.update({
        where: { id: accountRes.id },
        data: { balance: { increment: accountRes.type === 'CREDIT' ? amount : -amount } },
      });
    } else if (updated.type === 'transfer' && accountRes && destAccountRes) {
      if (accountRes.type !== 'CREDIT' && accountRes.balance < amount) throw AppError.badRequest('Insufficient funds');
      await db.ledgerEntry.createMany({
        data: [
          { accountId: accountRes.id, transactionId, amount: -amount, type: 'debit' },
          { accountId: destAccountRes.id, transactionId, amount, type: 'credit' },
        ],
      });
      await db.account.update({
        where: { id: accountRes.id },
        data: { balance: { increment: accountRes.type === 'CREDIT' ? amount : -amount } },
      });
      await db.account.update({
        where: { id: destAccountRes.id },
        data: { balance: { increment: destAccountRes.type === 'CREDIT' ? -amount : amount } },
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
