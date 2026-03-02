import { addMonthsPreservingDay } from '../../recurring/domain/nextDueDate';

/** Sets day of month; if invalid (e.g. 31 in Feb), clamps to last day of month. */
function setDaySafe(d: Date, day: number): void {
  d.setDate(1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
}

/**
 * Returns the payment date for installment N (1-indexed).
 * Uses addMonthsPreservingDay to avoid overflow (31 Jan -> 28 Feb).
 */
export function getPaymentDateForInstallment(
  purchase: {
    purchaseDate: Date;
    account?: { cutoffDay: number | null; paymentDay: number | null } | null;
  },
  installmentNum: number
): Date {
  const account = purchase.account;
  const purchaseDate = new Date(purchase.purchaseDate);

  if (!account?.cutoffDay || !account.paymentDay) {
    return addMonthsPreservingDay(purchaseDate, installmentNum - 1);
  }

  const chargeDate = addMonthsPreservingDay(purchaseDate, installmentNum - 1);
  const cutoffDate = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1);
  setDaySafe(cutoffDate, account.cutoffDay);

  if (chargeDate.getDate() > account.cutoffDay) {
    const next = addMonthsPreservingDay(cutoffDate, 1);
    cutoffDate.setTime(next.getTime());
  }

  const paymentDate = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), 1);
  setDaySafe(paymentDate, account.paymentDay);
  if (account.paymentDay <= account.cutoffDay) {
    const next = addMonthsPreservingDay(paymentDate, 1);
    paymentDate.setTime(next.getTime());
  }

  return paymentDate;
}

/**
 * Calculates next payment date for an installment purchase.
 * Uses account cutoff/payment cycle when available.
 */
export function getNextPaymentDate(purchase: {
  installments: number;
  paidInstallments: number;
  purchaseDate: Date;
  account?: { cutoffDay: number | null; paymentDay: number | null } | null;
}): Date | null {
  if (purchase.paidInstallments >= purchase.installments) return null;
  return getPaymentDateForInstallment(purchase, purchase.paidInstallments + 1);
}
