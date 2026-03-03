type DateFormatStyle = 'short' | 'medium' | 'long' | 'full' | 'monthYear' | 'dayMonth' | 'chart';

interface FormatOptions extends Intl.DateTimeFormatOptions {
  style?: DateFormatStyle;
  locale?: string;
}

const formats: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'short', timeZone: 'UTC' },
  medium: { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
  full: { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' },
  monthYear: { month: 'long', year: 'numeric', timeZone: 'UTC' },
  dayMonth: { day: '2-digit', month: 'short', timeZone: 'UTC' },
  chart: { month: 'short', timeZone: 'UTC' },
};

export const formatDateUTC = (date: Date | string, options: FormatOptions = {}): string => {
  const { style, locale = 'es-MX', ...rest } = options;
  const d = typeof date === 'string' ? new Date(date) : date;
  const finalOptions = style ? { ...formats[style], ...rest } : { ...formats.short, ...rest };
  return d.toLocaleDateString(locale, finalOptions);
};

export const isDateBeforeUTC = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
  const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
  return utc1 < utc2;
};

const isTodayUTC = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.getUTCFullYear() === today.getUTCFullYear() && d.getUTCMonth() === today.getUTCMonth() && d.getUTCDate() === today.getUTCDate();
};

const getTodayUTC = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/** Adds months preserving day; 31 Jan + 1 month = 28/29 Feb, not 3 Mar. */
export function addMonthsPreservingDay(baseDate: Date, months: number): Date {
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + months);
  const expectedMonth = (baseDate.getMonth() + months + 12) % 12;
  if (d.getMonth() !== expectedMonth) {
    d.setDate(0);
  }
  return d;
}
