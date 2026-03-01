# CoinGecko API - Inversiones con precios reales

Usamos la **API pública de CoinGecko** para actualizar `currentPrice` en inversiones tipo crypto. Valores reales, sin cálculos propios.

## Gratis, uso personal

- **Sin API key**: API pública, ~30 llamadas/minuto
- **Con API key** (opcional): `COINGECKO_API_KEY` en `.env` → Pro API, rate limit mayor
- **Uso**: personal, no comercial (ver [Términos CoinGecko](https://www.coingecko.com/en/api_terms))

## Cómo funciona

1. **Inversión crypto**: `type: "crypto"` y `ticker` = CoinGecko ID (ej. `bitcoin`, `ethereum`)
2. **POST /api/investments/refresh-prices**: refresca `currentPrice` para todas tus inversiones crypto con ticker
3. Una llamada a CoinGecko por lote (batch) → respetamos rate limit

## CoinGecko IDs comunes

| Cripto | Ticker (usar en inversión) |
|--------|----------------------------|
| Bitcoin | `bitcoin` |
| Ethereum | `ethereum` |
| USDT | `tether` |
| XRP | `ripple` |
| Solana | `solana` |
| BNB | `binancecoin` |

IDs completos: [CoinGecko /coins/list](https://api.coingecko.com/api/v3/coins/list) o busca en [coingecko.com](https://www.coingecko.com/).

## Moneda

Precios en **MXN** (esquema default). CoinGecko soporta `usd`, `eur`, etc.; por ahora fijamos MXN.

## Rate limit (429)

Si llamas `refresh-prices` muchas veces seguidas, CoinGecko puede devolver 429. Espera ~1 minuto y reintenta. Para uso personal, un refresh al abrir la pantalla de inversiones suele bastar.

## Integración con frontend

El frontend puede llamar `POST /api/investments/refresh-prices` al cargar la pantalla de inversiones para obtener precios actualizados antes de listar. No requiere body ni query params.

```http
POST /api/investments/refresh-prices
Authorization: Bearer <token>
```

Respuesta: `{ updated: number, total: number }`

## Variables de entorno

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `COINGECKO_API_KEY` | No | API key Pro. Sin ella usa API pública (~30/min). Obtener en [CoinGecko Pricing](https://www.coingecko.com/en/api/pricing) |

En `backend/.env`:
```
COINGECKO_API_KEY=cg_xxxxx
```

## Qué NO cubre CoinGecko

- CETES, bonos, acciones, ETFs → sin API gratuita aquí. `currentPrice` lo mantienes manual.
- Solo crypto listada en CoinGecko.
