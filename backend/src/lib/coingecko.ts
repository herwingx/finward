/**
 * CoinGecko API - Precios crypto para inversiones
 * https://www.coingecko.com/en/api
 *
 * Sin API key: ~30 calls/min (API pública).
 * Con COINGECKO_API_KEY: Pro API, rate limit mayor.
 */

import { logger } from '../shared/logger';

const PUBLIC_URL = 'https://api.coingecko.com/api/v3';
const PRO_URL = 'https://pro-api.coingecko.com/api/v3';

function getBaseUrl(): string {
  return process.env.COINGECKO_API_KEY ? PRO_URL : PUBLIC_URL;
}

export type CoinGeckoPriceResult = Record<string, Record<string, number>>;

/**
 * Obtiene precios actuales de cripto por CoinGecko API ID.
 * @param ids - IDs CoinGecko (bitcoin, ethereum, etc.) - max ~30 por llamada
 * @param vsCurrency - Moneda destino (mxn, usd)
 */
export async function fetchPrices(
  ids: string[],
  vsCurrency = 'mxn'
): Promise<CoinGeckoPriceResult> {
  if (ids.length === 0) return {};

  const unique = [...new Set(ids.map((id) => id.toLowerCase()))];
  const idsParam = unique.join(',');
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/simple/price?ids=${encodeURIComponent(idsParam)}&vs_currencies=${vsCurrency}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers['x-cg-pro-api-key'] = apiKey;

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, url }, 'CoinGecko API error');
      throw new Error(`CoinGecko ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as CoinGeckoPriceResult;
    return data;
  } catch (err) {
    logger.error({ err, ids: unique }, 'CoinGecko fetch failed');
    throw err;
  }
}
