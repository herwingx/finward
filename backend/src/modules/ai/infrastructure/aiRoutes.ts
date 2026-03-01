import { Router, Response } from 'express';
import { prisma } from '../../../lib/prisma';
import { subDays, endOfMonth } from 'date-fns';
import type { AuthRequest } from '../../../shared/types';

const router = Router();

router.get('/context', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const accounts = await prisma.account.findMany({
    where: { userId },
    include: {
      statements: {
        where: { status: 'PENDING' },
        orderBy: { paymentDueDate: 'asc' },
        take: 5,
      },
    },
  });

  const assets = accounts.filter((a) => a.type !== 'CREDIT').reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts.filter((a) => a.type === 'CREDIT').reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = assets - liabilities;
  const debtRatio = assets > 0 ? liabilities / assets : 0;

  const thirtyDaysAgo = subDays(new Date(), 30);
  const [expenses, income] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'expense', date: { gte: thirtyDaysAgo }, deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'income', date: { gte: thirtyDaysAgo }, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const burnRate = expenses._sum.amount ?? 0;
  const monthlyIncome = income._sum.amount ?? 0;
  const runwayDays = burnRate > 0 ? Math.floor(assets / (burnRate / 30)) : 999;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - burnRate) / monthlyIncome) * 100 : 0;

  const upcomingObligations: Array<{ desc: string; amount: number; dueDate: Date; dueInDays: number; type: string }> = [];

  for (const acc of accounts) {
    for (const st of acc.statements) {
      const dueInDays = Math.ceil((st.paymentDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      upcomingObligations.push({
        desc: `Pago TDC ${acc.name}`,
        amount: st.totalDue - st.paidAmount,
        dueDate: st.paymentDueDate,
        dueInDays,
        type: 'credit_card',
      });
    }
  }

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId, active: true, type: 'expense', nextDueDate: { gte: new Date(), lte: subDays(new Date(), -30) } },
    orderBy: { nextDueDate: 'asc' },
    take: 10,
  });

  for (const r of recurring) {
    const dueInDays = Math.ceil((r.nextDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    upcomingObligations.push({
      desc: r.description,
      amount: r.amount,
      dueDate: r.nextDueDate,
      dueInDays,
      type: 'recurring',
    });
  }

  upcomingObligations.sort((a, b) => a.dueInDays - b.dueInDays);

  const topCategories = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'expense', date: { gte: thirtyDaysAgo }, deletedAt: null },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 5,
  });

  const categories = await prisma.category.findMany({
    where: { id: { in: topCategories.map((c) => c.categoryId!).filter(Boolean) } },
  });

  const topExpenses = topCategories.map((tc) => {
    const cat = categories.find((c) => c.id === tc.categoryId);
    return {
      category: cat?.name ?? 'Sin categoría',
      amount: tc._sum.amount ?? 0,
      percentage: burnRate > 0 ? ((tc._sum.amount ?? 0) / burnRate) * 100 : 0,
    };
  });

  const warnings: string[] = [];
  if (runwayDays < 90) warnings.push('Menos de 3 meses de runway');
  if (debtRatio > 0.5) warnings.push('Ratio de deuda alto (>50%)');
  if (savingsRate < 10) warnings.push('Tasa de ahorro baja (<10%)');

  const naturalSummary = `
El usuario tiene patrimonio neto de $${netWorth.toLocaleString()}.
Activos líquidos: $${assets.toLocaleString()}, Deudas: $${liabilities.toLocaleString()}.
Gasto mensual promedio: $${burnRate.toLocaleString()}.
Ingreso mensual: $${monthlyIncome.toLocaleString()}.
Tasa de ahorro: ${savingsRate.toFixed(1)}%.
Runway: ${runwayDays} días.
${warnings.join('\n')}
${upcomingObligations.length > 0 ? `Próximo pago: ${upcomingObligations[0].desc} por $${upcomingObligations[0].amount.toLocaleString()} en ${upcomingObligations[0].dueInDays} días.` : 'Sin pagos próximos.'}
  `.trim();

  res.json({
    financial_health: {
      net_worth: netWorth,
      total_assets: assets,
      total_liabilities: liabilities,
      burn_rate_monthly: burnRate,
      monthly_income: monthlyIncome,
      savings_rate: Math.round(savingsRate * 100) / 100,
      runway_days: runwayDays,
      debt_ratio: Math.round(debtRatio * 100) / 100,
    },
    upcoming_obligations: upcomingObligations.slice(0, 10),
    top_expenses_last_30d: topExpenses,
    warnings,
    natural_summary: naturalSummary,
    generated_at: new Date().toISOString(),
  });
});

router.get('/query/safe-to-spend', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const today = new Date();
  const monthEnd = endOfMonth(today);

  const liquidAccounts = await prisma.account.findMany({
    where: { userId, type: { in: ['DEBIT', 'CASH'] } },
  });
  const liquidCash = liquidAccounts.reduce((s, a) => s + a.balance, 0);

  const pendingStatements = await prisma.creditCardStatement.findMany({
    where: {
      account: { userId },
      status: 'PENDING',
      paymentDueDate: { lte: monthEnd },
    },
  });
  const creditCardDue = pendingStatements.reduce((s, st) => s + (st.totalDue - st.paidAmount), 0);

  const recurringDue = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      active: true,
      type: 'expense',
      nextDueDate: { gte: today, lte: monthEnd },
    },
  });
  const recurringTotal = recurringDue.reduce((s, r) => s + r.amount, 0);

  const totalLiabilities = creditCardDue + recurringTotal;
  const safetyBuffer = liquidCash * 0.1;
  const safeToSpend = Math.max(0, liquidCash - totalLiabilities - safetyBuffer);

  res.json({
    safeToSpend: Math.round(safeToSpend * 100) / 100,
    breakdown: {
      liquidCash,
      creditCardDue,
      recurringDue: recurringTotal,
      totalLiabilities,
      safetyBuffer: Math.round(safetyBuffer * 100) / 100,
    },
    message:
      safeToSpend > 0
        ? `Puedes gastar hasta $${safeToSpend.toLocaleString()} de forma segura.`
        : 'No tienes margen de gasto seguro este mes. Prioriza tus compromisos.',
    calculated_at: new Date().toISOString(),
  });
});

export default router;
