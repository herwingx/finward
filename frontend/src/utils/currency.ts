/**
 * Currency formatting utilities - DRY helper for consistent display across the app.
 * Uses es-MX locale and MXN by default.
 */
interface FormatCurrencyOptions {
  currency?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
}

export function formatCurrency(
  amount: number,
  options?: FormatCurrencyOptions
): string {
  const {
    currency = 'MXN',
    maximumFractionDigits = 0,
    minimumFractionDigits,
  } = options ?? {};
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits,
    ...(minimumFractionDigits != null && { minimumFractionDigits }),
  }).format(amount);
}
