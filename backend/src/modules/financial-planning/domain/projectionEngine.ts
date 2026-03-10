/**
 * Projection Engine — Expande recurrentes, MSI y préstamos en eventos con fechas.
 * Usado para calcular proyección de flujo de caja en un período.
 */
import { calculateNextDueDate } from '../../recurring/domain/nextDueDate';
import { getPaymentDateForInstallment } from '../../installments/domain/nextPaymentDate';

export interface ProjectedIncomeEvent {
  id: string;
  uniqueId: string;
  description: string;
  amount: number;
  dueDate: Date;
  type: 'income';
  source: 'recurring' | 'transaction';
  recurringTransactionId?: string;
  category?: { id: string; name: string; icon: string; color: string; budgetType?: string | null };
}

export interface ProjectedExpenseEvent {
  id: string;
  uniqueId: string;
  description: string;
  amount: number;
  dueDate: Date;
  type: 'expense';
  source: 'recurring' | 'transaction';
  recurringTransactionId?: string;
  endDate?: Date | null;
  category?: { id: string; name: string; icon: string; color: string; budgetType?: string | null };
}

export interface ProjectedMsiEvent {
  id: string;
  originalId: string;
  uniqueId: string;
  description: string;
  purchaseName: string;
  amount: number;
  dueDate: Date;
  installmentNumber: number;
  totalInstallments: number;
  isLastInstallment: boolean;
  category?: { id: string; name: string; icon: string; color: string };
}

export interface ProjectedLoanEvent {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  loanType: string;
}

/** Genera fechas de vencimiento para una transacción recurrente dentro del período. */
export function expandRecurringInPeriod(
  recurring: {
    id: string;
    amount: number;
    description: string;
    type: string;
    frequency: string;
    startDate: Date;
    nextDueDate: Date;
    endDate: Date | null;
    category?: { id: string; name: string; icon: string; color: string; budgetType?: string | null };
  },
  periodStart: Date,
  periodEnd: Date
): { date: Date; amount: number }[] {
  const events: { date: Date; amount: number }[] = [];
  let current = new Date(recurring.nextDueDate);

  const start = periodStart.getTime();
  const end = periodEnd.getTime();
  const today = new Date().getTime();

  while (current.getTime() <= end) {
    if (recurring.endDate && current > recurring.endDate) break;

    const isOverdue = current.getTime() < start && current.getTime() < today;

    // Si la fecha cae en el periodo o si es un pago vencido que el usuario no ha completado
    if (current.getTime() >= start || isOverdue) {
      events.push({ date: new Date(current), amount: recurring.amount });
    }
    current = calculateNextDueDate(current, recurring.frequency);
  }

  return events;
}


/** Genera eventos MSI dentro del período. */
export function expandMsiInPeriod(
  purchase: {
    id: string;
    description: string;
    totalAmount: number;
    installments: number;
    paidInstallments: number;
    paidAmount: number;
    monthlyPayment: number;
    purchaseDate: Date;
    account?: { cutoffDay: number | null; daysToPayAfterCutoff: number | null } | null;
    category?: { id: string; name: string; icon: string; color: string };
  },
  periodStart: Date,
  periodEnd: Date
): ProjectedMsiEvent[] {
  const events: ProjectedMsiEvent[] = [];
  const unpaidCount = purchase.installments - purchase.paidInstallments;
  if (unpaidCount <= 0) return events;

  const remaining = purchase.totalAmount - purchase.paidAmount;
  const lastInstallmentAmount = Math.round((remaining - (unpaidCount - 1) * purchase.monthlyPayment) * 100) / 100;

  const start = periodStart.getTime();
  const end = periodEnd.getTime();
  const today = new Date().getTime();

  for (let i = 1; i <= unpaidCount; i++) {
    const installmentNum = purchase.paidInstallments + i;
    const dueDate = getPaymentDateForInstallment(
      { purchaseDate: purchase.purchaseDate, account: purchase.account },
      installmentNum
    );

    const time = dueDate.getTime();
    const isOverdue = time < start && time < today;

    if ((time >= start && time <= end) || isOverdue) {
      const isLast = i === unpaidCount;
      events.push({
        id: `${purchase.id}-${installmentNum}`,
        originalId: purchase.id,
        uniqueId: `${purchase.id}-${installmentNum}-${time}`,
        description: `Cuota ${installmentNum}/${purchase.installments} - ${purchase.description}`,
        purchaseName: purchase.description,
        amount: isLast ? lastInstallmentAmount : purchase.monthlyPayment,
        dueDate,
        installmentNumber: installmentNum,
        totalInstallments: purchase.installments,
        isLastInstallment: isLast,
        category: purchase.category,
      });
    }
  }
  return events;
}
