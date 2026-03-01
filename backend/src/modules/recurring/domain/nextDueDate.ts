/**
 * Calculates next due date from current date based on frequency.
 */
export function calculateNextDueDate(from: Date, frequency: string): Date {
  const d = new Date(from);
  const f = (frequency || '').toLowerCase();

  if (f === 'daily') d.setDate(d.getDate() + 1);
  else if (f === 'weekly') d.setDate(d.getDate() + 7);
  else if (f === 'biweekly' || f === 'biweekly_15_30') d.setDate(d.getDate() + 14);
  else if (f === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (f === 'bimonthly') d.setMonth(d.getMonth() + 2);
  else if (f === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);

  return d;
}
