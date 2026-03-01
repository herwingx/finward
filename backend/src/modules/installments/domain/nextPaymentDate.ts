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

  const account = purchase.account;
  const nextInstallmentNum = purchase.paidInstallments + 1;

  if (!account?.cutoffDay || !account.paymentDay) {
    const d = new Date(purchase.purchaseDate);
    d.setMonth(d.getMonth() + (nextInstallmentNum - 1));
    return d;
  }

  const purchaseDate = new Date(purchase.purchaseDate);
  const chargeDate = new Date(purchaseDate);
  chargeDate.setMonth(chargeDate.getMonth() + (nextInstallmentNum - 1));

  let cutoffDate = new Date(chargeDate);
  cutoffDate.setDate(account.cutoffDay);

  if (chargeDate.getDate() > account.cutoffDay) {
    cutoffDate.setMonth(cutoffDate.getMonth() + 1);
  }

  const paymentDate = new Date(cutoffDate);
  if (account.paymentDay <= account.cutoffDay) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
  }
  paymentDate.setDate(account.paymentDay);

  return paymentDate;
}
