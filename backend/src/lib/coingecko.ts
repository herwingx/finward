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

export interface CoinGeckoSearchCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb?: string;
  large?: string;
}

export interface CoinGeckoSearchResult {
  coins: CoinGeckoSearchCoin[];
}

/**
 * Busca monedas en CoinGecko por nombre o símbolo.
 * Usado para autocompletar el ticker al crear inversiones tipo CRYPTO.
 */
export async function searchCoins(query: string): Promise<CoinGeckoSearchCoin[]> {
  const q = (query || '').trim().toLowerCase();
  if (q.length < 2) return [];

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/search?query=${encodeURIComponent(q)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = process.env.COINGECKO_API_KEY;
  if (apiKey) headers['x-cg-pro-api-key'] = apiKey;

  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, url }, 'CoinGecko search error');
      return [];
    }

    const data = (await res.json()) as CoinGeckoSearchResult;
    return (data.coins || []).slice(0, 15);
  } catch (err) {
    logger.error({ err, query: q }, 'CoinGecko search failed');
    return [];
  }
}

/** Respuesta de /coins/markets (campos usados) */
interface CoinGeckoMarketItem {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  image?: string;
}

/**
 * Obtiene las criptos top por capitalización (para select sin escribir).
 * Usa /coins/markets con per_page limitado. Incluye image para logos.
 */
export async function getTopCoins(limit = 50): Promise<CoinGeckoSearchCoin[]> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/coins/markets?vs_currency=mxn&order=market_cap_desc&per_page=${Math.min(limit, 100)}&page=1&sparkline=false`;

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
      logger.warn({ status: res.status, url }, 'CoinGecko markets error');
      return [];
    }

    const data = (await res.json()) as CoinGeckoMarketItem[];
    return data.map((c) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
      market_cap_rank: c.market_cap_rank,
      thumb: c.image,
    }));
  } catch (err) {
    logger.error({ err }, 'CoinGecko getTopCoins failed');
    return [];
  }
}
