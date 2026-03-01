/**
 * Yahoo Finance - Acciones y ETFs (uso personal)
 * API no oficial, sin API key.
 * https://github.com/gadicc/yahoo-finance2
 */

import YahooFinance from 'yahoo-finance2';
import { logger } from '../shared/logger';

const client = new YahooFinance();

export type YahooQuoteResult = { price: number; currency: string } | null;

/**
 * Obtiene precio actual de un símbolo (acciones, ETFs).
 * Ej: NVDA, AAPL, AMXL.MX (BMV), ^GSPC (S&P 500)
 */
export async function fetchStockPrice(symbol: string): Promise<YahooQuoteResult> {
  try {
    const quote = await client.quote(symbol);
    const price = quote.regularMarketPrice;
    const currency = quote.currency ?? 'USD';
    if (typeof price !== 'number' || price <= 0) return null;
    return { price, currency };
  } catch (err) {
    logger.warn({ err, symbol }, 'Yahoo Finance quote failed');
    return null;
  }
}
