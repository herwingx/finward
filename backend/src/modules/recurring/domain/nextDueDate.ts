/**
 * Adds months to a date, preserving the day when possible.
 * If the target month has fewer days (e.g. 31 Jan -> Feb), returns the last day of the target month.
 * Prevents overflow: 31 Jan + 1 month = 28/29 Feb, NOT 3 Mar.
 */
export function addMonthsPreservingDay(baseDate: Date, months: number): Date {
  const d = new Date(baseDate.getTime());
  const origDay = d.getUTCDate();
  
  // Trick: set date to 1 to avoid overflow when changing month
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  
  // Now set the day back to origDay, or the max day of the new month
  const targetYear = d.getUTCFullYear();
  const targetMonth = d.getUTCMonth();
  const maxDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  
  d.setUTCDate(Math.min(origDay, maxDays));
  
  return d;
}

/**
 * Calculates next due date from current date based on frequency.
 * Handles month overflow: 31 -> Feb becomes 28/29, not 3 Mar.
 */
export function calculateNextDueDate(from: Date, frequency: string): Date {
  const d = new Date(from);
  const f = (frequency || '').toLowerCase();

  if (f === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (f === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (f === 'biweekly') d.setUTCDate(d.getUTCDate() + 14);
  else if (f === 'biweekly_15_30') {
    const day = d.getUTCDate();
    if (day <= 15) {
      const maxDays = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(maxDays);
    } else {
      d.setUTCMonth(d.getUTCMonth() + 1);
      d.setUTCDate(15);
    }
  }
  else if (f === 'monthly') return addMonthsPreservingDay(from, 1);
  else if (f === 'bimonthly') return addMonthsPreservingDay(from, 2);
  else if (f === 'semiannually') return addMonthsPreservingDay(from, 6);
  else if (f === 'yearly') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else return addMonthsPreservingDay(from, 1);

  return d;
}
