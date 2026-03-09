/**
 * Yahoo Finance - Acciones y ETFs (uso personal)
 * API no oficial, sin API key.
 * https://github.com/gadicc/yahoo-finance2
 */

import YahooFinance from 'yahoo-finance2';
import { logger } from '../shared/logger';

const client = new YahooFinance();

export type YahooQuoteResult = { price: number; currency: string } | null;

export type YahooSearchQuote = { symbol: string; shortname?: string; longname?: string; quoteType?: string };

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

/**
 * Busca acciones/ETFs por nombre o símbolo (autocompletado).
 * Filtra EQUITY y ETF.
 */
export async function searchStocks(query: string): Promise<YahooSearchQuote[]> {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  try {
    const result = await client.search(q, { quotesCount: 15, newsCount: 0 });
    const quotes = result?.quotes ?? [];
    const filtered = quotes.filter(
      (item: { isYahooFinance?: boolean; quoteType?: string; symbol?: string }) =>
        item.isYahooFinance === true &&
        ['EQUITY', 'ETF'].includes(String(item.quoteType ?? '')) &&
        typeof item.symbol === 'string'
    ) as Array<{ symbol: string; shortname?: string; longname?: string }>;
    return filtered.slice(0, 15).map((item) => ({
      symbol: item.symbol,
      shortname: item.shortname,
      longname: item.longname,
    }));
  } catch (err) {
    logger.warn({ err, query: q }, 'Yahoo Finance search failed');
    return [];
  }
}
