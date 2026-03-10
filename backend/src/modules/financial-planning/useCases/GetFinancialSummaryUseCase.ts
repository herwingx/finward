/**
 * Construye el resumen financiero con proyección completa.
 * Incluye: transacciones reales, recurrentes expandidas, MSI, préstamos.
 */
import { expandRecurringInPeriod, expandMsiInPeriod } from '../domain/projectionEngine';

export interface FinancialSummaryInput {
  periodStart: Date;
  periodEnd: Date;
  periodType: string;
  mode: 'calendar' | 'projection';
  /** Dinero disponible (efectivo + cuentas líquidas) */
  availableFunds: number;
  /** Total activos (cuentas + inversiones + metas + préstamos prestados) */
  totalAssets: number;
  /** Total pasivos (TDC + préstamos recibidos) */
  totalLiabilities: number;
  transactions: Array<{ type: string; amount: number; date: Date; category?: { budgetType?: string | null } | null }>;
  recurring: Array<{
    id: string;
    amount: number;
    description: string;
    type: string;
    frequency: string;
    startDate: Date;
    nextDueDate: Date;
    endDate: Date | null;
    category?: { id: string; name: string; icon: string; color: string; budgetType?: string | null };
  }>;
  loans: Array<{
    id: string;
    remainingAmount: number;
    expectedPayDate: Date | null;
    borrowerName: string;
    loanType: string;
  }>;
  installments: Array<{
    id: string;
    description: string;
    totalAmount: number;
    installments: number;
    paidInstallments: number;
    paidAmount: number;
    monthlyPayment: number;
    purchaseDate: Date;
    account?: { id?: string; name?: string; cutoffDay: number | null; daysToPayAfterCutoff: number | null } | null;
    category?: { id: string; name: string; icon: string; color: string };
  }>;
  creditCardRegularPayments?: Array<{
    accountId: string;
    accountName: string;
    amount: number;
    dueDate: Date;
  }>;
  monthlyNetIncome: number | null;
}

export interface FinancialSummaryOutput {
  periodStart: string;
  periodEnd: string;
  periodType: string;
  /** Dinero disponible (efectivo líquido) */
  availableFunds: number;
  /** Total activos */
  totalAssets: number;
  /** Total pasivos */
  totalLiabilities: number;
  currentMSIDebt: number;
  expectedIncome: Array<{ id: string; uniqueId: string; description: string; amount: number; dueDate: string; recurringTransactionId?: string; category?: object }>;
  totalExpectedIncome: number;
  totalReceivedIncome: number;
  totalPeriodIncome: number;
  expectedExpenses: Array<{ id: string; uniqueId: string; description: string; amount: number; dueDate: string; recurringTransactionId?: string; endDate?: string | null; category?: object }>;
  msiPaymentsDue: Array<{ id: string; originalId: string; uniqueId: string; description: string; purchaseName: string; amount: number; dueDate: string; installmentNumber: number; totalInstallments: number; isLastInstallment: boolean; category?: object; accountId?: string; accountName?: string }>;
  totalExpectedExpenses: number;
  totalMSIPayments: number;
  totalCommitments: number;
  projectedBalance: number;
  netWorth: number;
  disposableIncome: number;
  budgetAnalysis?: { needs: { projected: number; ideal: number }; wants: { projected: number; ideal: number }; savings: { projected: number; ideal: number } };
  isSufficient: boolean;
  shortfall?: number;
  warnings: string[];
}

export function getFinancialSummary(input: FinancialSummaryInput): FinancialSummaryOutput {
  const { periodStart, periodEnd, availableFunds, totalAssets, totalLiabilities, transactions, recurring, loans, installments, creditCardRegularPayments = [], monthlyNetIncome } = input;

  const expectedIncome: FinancialSummaryOutput['expectedIncome'] = [];
  const expectedExpenses: FinancialSummaryOutput['expectedExpenses'] = [];
  const msiPaymentsDue: FinancialSummaryOutput['msiPaymentsDue'] = [];

  for (const r of recurring) {
    const events = expandRecurringInPeriod(r, periodStart, periodEnd);
    for (const ev of events) {
      const item = {
        id: r.id,
        uniqueId: `${r.id}-${ev.date.getTime()}`,
        description: r.description,
        amount: ev.amount,
        dueDate: ev.date.toISOString(),
        recurringTransactionId: r.id,
        category: r.category,
      };
      if (r.type === 'income') expectedIncome.push(item);
      else expectedExpenses.push({ ...item, endDate: r.endDate?.toISOString() ?? null });
    }
  }

  for (const l of loans) {
    if (!l.expectedPayDate) continue;

    const due = new Date(l.expectedPayDate);
    const start = periodStart.getTime();
    const end = periodEnd.getTime();
    const today = new Date().getTime();
    const time = due.getTime();

    const isOverdue = time < start && time < today;

    if ((time >= start && time <= end) || isOverdue) {
      const item = {
        id: l.id,
        uniqueId: `loan-${l.id}-${due.getTime()}`,
        description: `Préstamo: ${l.borrowerName}`,
        amount: l.remainingAmount,
        dueDate: due.toISOString(),
        category: undefined,
      };
      if (l.loanType === 'lent') expectedIncome.push(item);
      else expectedExpenses.push({ ...item, endDate: null });
    }
  }

  const activeInstallments = installments.filter((i) => i.paidAmount < i.totalAmount);
  const currentMSIDebt = activeInstallments.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);

  for (const m of activeInstallments) {
    const events = expandMsiInPeriod(m, periodStart, periodEnd);
    for (const ev of events) {
      msiPaymentsDue.push({
        ...ev,
        dueDate: ev.dueDate.toISOString(),
        category: ev.category,
        accountId: m.account?.id,
        accountName: m.account?.name,
      });
    }
  }

  for (const cp of creditCardRegularPayments) {
    if (cp.amount <= 0) continue;
    const due = new Date(cp.dueDate);
    const start = periodStart.getTime();
    const end = periodEnd.getTime();
    const today = new Date().getTime();
    const time = due.getTime();

    const isOverdue = time < start && time < today;

    if ((time >= start && time <= end) || isOverdue) {
      expectedExpenses.push({
        id: `ccp-${cp.accountId}`,
        uniqueId: `ccp-${cp.accountId}-${time}`,
        description: `Pago Tarjeta: ${cp.accountName}`,
        amount: cp.amount,
        dueDate: due.toISOString(),
        category: undefined,
      });
    }
  }

  const incomeTotal = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenseTotal = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalExpectedIncome = expectedIncome.reduce((s, e) => s + e.amount, 0);
  const totalExpectedExpenses = expectedExpenses.reduce((s, e) => s + e.amount, 0);
  const totalMSIPayments = msiPaymentsDue.reduce((s, e) => s + e.amount, 0);

  const totalPeriodIncome = monthlyNetIncome != null && monthlyNetIncome > 0
    ? Math.max(incomeTotal + totalExpectedIncome, monthlyNetIncome)
    : incomeTotal + totalExpectedIncome;
  const totalCommitments = expenseTotal + totalExpectedExpenses + totalMSIPayments;

  const budgetByType = { need: 0, want: 0, savings: 0 };
  for (const e of [...expectedExpenses, ...msiPaymentsDue]) {
    const bt = (e.category as { budgetType?: string } | undefined)?.budgetType?.toLowerCase();
    if (bt === 'need') budgetByType.need += e.amount;
    else if (bt === 'want') budgetByType.want += e.amount;
    else if (bt === 'savings') budgetByType.savings += e.amount;
  }
  for (const t of transactions.filter((x) => x.type === 'expense')) {
    const bt = t.category?.budgetType?.toLowerCase();
    if (bt === 'need') budgetByType.need += t.amount;
    else if (bt === 'want') budgetByType.want += t.amount;
    else if (bt === 'savings') budgetByType.savings += t.amount;
  }

  const disposableIncome = totalPeriodIncome - totalCommitments;
  /** Saldo proyectado = dinero disponible + ingresos - compromisos */
  const projectedBalance = availableFunds + totalPeriodIncome - totalCommitments;
  const netWorth = totalAssets - totalLiabilities;
  const isSufficient = projectedBalance >= 0;
  const shortfall = isSufficient ? undefined : Math.abs(projectedBalance);

  const warnings: string[] = [];
  if (!isSufficient && shortfall) warnings.push(`Déficit proyectado: $${shortfall.toFixed(2)}`);
  if (totalCommitments > totalPeriodIncome * 0.8) warnings.push('Compromisos superan 80% de ingresos');

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodType: input.periodType,
    availableFunds,
    totalAssets,
    totalLiabilities,
    currentMSIDebt,
    expectedIncome,
    totalExpectedIncome,
    totalReceivedIncome: incomeTotal,
    totalPeriodIncome,
    expectedExpenses,
    msiPaymentsDue,
    totalExpectedExpenses,
    totalMSIPayments,
    totalCommitments,
    projectedBalance,
    netWorth,
    disposableIncome,
    budgetAnalysis: {
      needs: { projected: budgetByType.need, ideal: 50 },
      wants: { projected: budgetByType.want, ideal: 30 },
      savings: { projected: budgetByType.savings, ideal: 20 },
    },
    isSufficient,
    shortfall,
    warnings,
  };
}
