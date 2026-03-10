export interface BillingCycleInput {
  cutoffDay: number;
  daysToPayAfterCutoff: number;
}

export interface BillingCycle {
  cycleStartDate: Date;
  cutoffDate: Date;
  paymentDate: Date;
  isBeforeCutoff: boolean;
  daysUntilPayment: number;
  daysUntilCutoff: number;
}

export function getBillingCycle(input: BillingCycleInput, referenceDate?: Date): BillingCycle {
  const { cutoffDay, daysToPayAfterCutoff } = input;
  const now = referenceDate ?? new Date();
  let cutoffMonth = now.getMonth();
  let cutoffYear = now.getFullYear();

  if (now.getDate() > cutoffDay) {
    cutoffMonth += 1;
    if (cutoffMonth > 11) {
      cutoffMonth = 0;
      cutoffYear += 1;
    }
  }

  const cutoffDate = new Date(cutoffYear, cutoffMonth, cutoffDay, 23, 59, 59, 999);
  const paymentDate = new Date(cutoffDate);
  paymentDate.setDate(paymentDate.getDate() + daysToPayAfterCutoff);
  paymentDate.setHours(12, 0, 0, 0);

  const prevCutoffDate = new Date(cutoffDate);
  prevCutoffDate.setMonth(prevCutoffDate.getMonth() - 1);
  const cycleStartDate = new Date(prevCutoffDate);
  cycleStartDate.setDate(cycleStartDate.getDate() + 1);
  cycleStartDate.setHours(0, 0, 0, 0);

  return {
    cycleStartDate,
    cutoffDate,
    paymentDate,
    isBeforeCutoff: now <= cutoffDate,
    daysUntilPayment: Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    daysUntilCutoff: Math.ceil((cutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  };
}
