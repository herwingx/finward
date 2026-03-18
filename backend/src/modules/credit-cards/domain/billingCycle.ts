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
  
  // Use UTC to prevent timezone shifts when dealing with dates near midnight
  let cutoffMonth = now.getUTCMonth();
  let cutoffYear = now.getUTCFullYear();

  if (now.getUTCDate() > cutoffDay) {
    cutoffMonth += 1;
    if (cutoffMonth > 11) {
      cutoffMonth = 0;
      cutoffYear += 1;
    }
  }

  // Safely construct the cutoff date (prevent 30 Feb -> 2 Mar)
  const maxDaysInCutoffMonth = new Date(Date.UTC(cutoffYear, cutoffMonth + 1, 0)).getUTCDate();
  const actualCutoffDay = Math.min(cutoffDay, maxDaysInCutoffMonth);
  
  const cutoffDate = new Date(Date.UTC(cutoffYear, cutoffMonth, actualCutoffDay, 23, 59, 59, 999));
  
  // Calculate payment date (add days explicitly)
  const paymentDate = new Date(cutoffDate.getTime());
  paymentDate.setUTCDate(paymentDate.getUTCDate() + daysToPayAfterCutoff);
  paymentDate.setUTCHours(12, 0, 0, 0);

  // Calculate previous cutoff date safely
  let prevCutoffMonth = cutoffMonth - 1;
  let prevCutoffYear = cutoffYear;
  if (prevCutoffMonth < 0) {
    prevCutoffMonth = 11;
    prevCutoffYear -= 1;
  }
  const maxDaysInPrevMonth = new Date(Date.UTC(prevCutoffYear, prevCutoffMonth + 1, 0)).getUTCDate();
  const actualPrevCutoffDay = Math.min(cutoffDay, maxDaysInPrevMonth);
  
  const prevCutoffDate = new Date(Date.UTC(prevCutoffYear, prevCutoffMonth, actualPrevCutoffDay, 23, 59, 59, 999));
  
  // Cycle start date is the day after the previous cutoff
  const cycleStartDate = new Date(prevCutoffDate.getTime());
  cycleStartDate.setUTCDate(cycleStartDate.getUTCDate() + 1);
  cycleStartDate.setUTCHours(0, 0, 0, 0);

  return {
    cycleStartDate,
    cutoffDate,
    paymentDate,
    isBeforeCutoff: now <= cutoffDate,
    daysUntilPayment: Math.ceil((paymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    daysUntilCutoff: Math.ceil((cutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  };
}
