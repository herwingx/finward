# Yahoo Finance - Acciones y ETFs

Usamos **yahoo-finance2** (API no oficial) para actualizar `currentPrice` en inversiones tipo stock. Acciones, ETFs, índices.

## Gratis, sin API key

- **API no oficial**: Yahoo no tiene API pública oficial
- **Sin API key**: no requiere configuración
- **Uso**: personal (ver [yahoo-finance2](https://github.com/gadicc/yahoo-finance2))

## Cómo funciona

1. **Inversión stock**: `type: "stock"` y `ticker` = símbolo Yahoo (ej. `NVDA`, `AAPL`)
2. **POST /api/investments/refresh-prices**: refresca crypto (CoinGecko) + stock (Yahoo) en una llamada
3. Respuesta: `{ updated, crypto, stock }`

## Símbolos comunes

| Asset | Ticker Yahoo |
|-------|--------------|
| NVIDIA | `NVDA` |
| Apple | `AAPL` |
| Microsoft | `MSFT` |
| S&P 500 | `^GSPC` |
| América Móvil (BMV) | `AMXL.MX` |

Buscar: [finance.yahoo.com](https://finance.yahoo.com/)

## Moneda

US stocks → USD. BMV (México) → MXN. Usa `currency: "USD"` para acciones US.

## Variables de entorno

Ninguna. Yahoo Finance no requiere API key.
