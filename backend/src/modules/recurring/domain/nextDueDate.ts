/**
 * Adds months to a date, preserving the day when possible.
 * If the target month has fewer days (e.g. 31 Jan -> Feb), returns the last day of the target month.
 * Prevents overflow: 31 Jan + 1 month = 28/29 Feb, NOT 3 Mar.
 */
export function addMonthsPreservingDay(baseDate: Date, months: number): Date {
  const d = new Date(baseDate);
  const origDay = d.getDate();
  d.setMonth(d.getMonth() + months);

  const expectedMonth = (baseDate.getMonth() + months + 12) % 12;
  if (d.getMonth() !== expectedMonth) {
    d.setDate(0); // Go to last day of previous month = last day of target month
  }
  return d;
}

/**
 * Calculates next due date from current date based on frequency.
 * Handles month overflow: 31 -> Feb becomes 28/29, not 3 Mar.
 */
export function calculateNextDueDate(from: Date, frequency: string): Date {
  const d = new Date(from);
  const f = (frequency || '').toLowerCase();

  if (f === 'daily') d.setDate(d.getDate() + 1);
  else if (f === 'weekly') d.setDate(d.getDate() + 7);
  else if (f === 'biweekly' || f === 'biweekly_15_30') d.setDate(d.getDate() + 14);
  else if (f === 'monthly') return addMonthsPreservingDay(from, 1);
  else if (f === 'bimonthly') return addMonthsPreservingDay(from, 2);
  else if (f === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else return addMonthsPreservingDay(from, 1);

  return d;
}
