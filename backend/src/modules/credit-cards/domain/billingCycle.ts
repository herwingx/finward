export interface BillingCycleInput {
  cutoffDay: number;
  paymentDay: number;
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
  const { cutoffDay, paymentDay } = input;
  const now = referenceDate ?? new Date();
  const currentDay = now.getDate();
  let paymentMonth = now.getMonth();
  let paymentYear = now.getFullYear();

  if (currentDay > paymentDay) {
    paymentMonth += 1;
    if (paymentMonth > 11) {
      paymentMonth = 0;
      paymentYear += 1;
    }
  }

  const paymentDate = new Date(paymentYear, paymentMonth, paymentDay, 12, 0, 0);

  let cutoffMonth = paymentMonth;
  let cutoffYear = paymentYear;
  if (paymentDay < cutoffDay) {
    cutoffMonth -= 1;
    if (cutoffMonth < 0) {
      cutoffMonth = 11;
      cutoffYear -= 1;
    }
  }

  const cutoffDate = new Date(cutoffYear, cutoffMonth, cutoffDay, 23, 59, 59, 999);
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
