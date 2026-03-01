import { prisma } from '../lib/prisma';
import { startOfDay } from 'date-fns';

export async function createDailyAccountSnapshots(): Promise<{ created: number; errors: number }> {
  const today = startOfDay(new Date());
  const accounts = await prisma.account.findMany({ select: { id: true, balance: true } });
  let errors = 0;

  for (const account of accounts) {
    try {
      await prisma.accountSnapshot.upsert({
        where: { accountId_date: { accountId: account.id, date: today } },
        update: { balance: account.balance },
        create: { accountId: account.id, balance: account.balance, date: today },
      });
    } catch (err) {
      errors++;
    }
  }

  return { created: accounts.length, errors };
}
