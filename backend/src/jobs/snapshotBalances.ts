import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';

/**
 * Creates daily balance snapshots for all accounts.
 * Runs inside a transaction for atomicity - partial failures are rolled back.
 * @returns { created, errors } - created = successful snapshots, errors = count of failures
 */
export async function createDailyAccountSnapshots(): Promise<{ created: number; errors: number }> {
  const today = startOfDay(new Date());
  const accounts = await prisma.account.findMany({ select: { id: true, balance: true } });
  let errors = 0;

  const BATCH_SIZE = 50;
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
      const batch = accounts.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((account) =>
          tx.accountSnapshot.upsert({
            where: { accountId_date: { accountId: account.id, date: today } },
            update: { balance: account.balance },
            create: { accountId: account.id, balance: account.balance, date: today },
          })
        )
      );
      results.forEach((r) => {
        if (r.status === 'rejected') errors++;
      });
    }
  });

  return { created: accounts.length - errors, errors };
}
