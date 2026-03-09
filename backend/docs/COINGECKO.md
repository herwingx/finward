# CoinGecko API - Precios Crypto

## Propósito y función

CoinGecko se usa en Finward para:
1. **Buscar criptos** — `GET /api/investments/coins/search?q=` para autocompletado al crear inversiones.
2. **Actualizar precios** — `POST /api/investments/refresh-prices` actualiza `currentPrice` de inversiones CRYPTO.

**Flujo:** (1) Creas inversión con `type: "CRYPTO"` y `ticker` = CoinGecko ID (ej. `bitcoin`). El formulario ofrece autocompletado vía `/coins/search`. (2) Llamas a `POST /api/investments/refresh-prices`. (3) El backend consulta CoinGecko en lote y actualiza `currentPrice` en la BD.

Para **acciones y ETFs**, ver [YAHOO_FINANCE.md](YAHOO_FINANCE.md).

## Gratis, uso personal

- **Sin API key**: API pública, ~30 llamadas/minuto
- **Con API key** (opcional): `COINGECKO_API_KEY` en `.env` → Pro API, rate limit mayor
- **Uso**: personal, no comercial (ver [Términos CoinGecko](https://www.coingecko.com/en/api_terms))

## Cómo agregar cripto en la app

El formulario incluye **autocompletado de ticker** para criptos:

1. Inversiones → Nuevo Activo
2. Tipo **Cripto**
3. **Nombre**: ej. "Bitcoin"
4. **Ticker**: escribe (ej. `bit`) → aparecen sugerencias de CoinGecko; selecciona o escribe el CoinGecko ID en minúsculas (ej. `bitcoin`, `ethereum`)
5. Cantidad, Precio compra, guardar

El backend normaliza el ticker a minúsculas para CRYPTO. Tras guardar, `refresh-prices` actualiza los precios desde CoinGecko.

## CoinGecko IDs comunes

| Cripto | Ticker (usar en inversión) |
|--------|----------------------------|
| Bitcoin | `bitcoin` |
| Ethereum | `ethereum` |
| USDT | `tether` |
| XRP | `ripple` |
| Solana | `solana` |
| BNB | `binancecoin` |
| Dogecoin | `dogecoin` |
| Cardano | `cardano` |
| Polkadot | `polkadot` |

IDs completos: [api.coingecko.com/api/v3/coins/list](https://api.coingecko.com/api/v3/coins/list). Búsqueda: [coingecko.com](https://www.coingecko.com/).

## Moneda

Precios en **MXN** (esquema default). CoinGecko soporta `usd`, `eur`, etc.; por ahora fijamos MXN.

## Rate limit (429)

Si llamas `refresh-prices` muchas veces seguidas, CoinGecko puede devolver 429. Espera ~1 minuto y reintenta. El frontend limita las llamadas: auto-refresh solo si han pasado >15 min y botón manual con feedback.

## Integración técnica

**Endpoints:**

- **Top criptos (para select):** `GET /api/investments/coins/top?limit=50` — Devuelve las 50 principales por capitalización. Permite elegir cripto en un select sin escribir.
- **Buscar criptos:** `GET /api/investments/coins/search?q=bit`

```http
GET /api/investments/coins/search?q=bitcoin
Authorization: Bearer <token>
```

Respuesta: `{ coins: [{ id, name, symbol, market_cap_rank, thumb, ... }] }`. Implementación: `searchCoins(query)` en `coingecko.ts` → CoinGecko `/search?query=`.

- **Actualizar precios:** `POST /api/investments/refresh-prices` (sin body ni query).

```http
POST /api/investments/refresh-prices
Authorization: Bearer <token>
```

Respuesta: `{ updated, crypto, stock }` (updated = inversiones actualizadas).

**Implementación backend:** `backend/src/lib/coingecko.ts` → `fetchPrices(ids, vsCurrency)` y `searchCoins(query)`. La ruta en `investmentRoutes.ts` usa `searchCoins` para el autocompletado y, en `refresh-prices`, agrupa todas las crypto del usuario, llama batch a CoinGecko `/simple/price?ids=...&vs_currencies=mxn`, y actualiza cada inversión.

### Frontend (InvestmentsPage)

- **Botón "Actualizar precios"**: actualización manual. Llama al endpoint e invalida la query de inversiones. Muestra toast al completar.
- **Indicador "Actualizado hace X min"**: usa el `lastPriceUpdate` más reciente de inversiones con ticker (crypto o stock). Muestra "Hace un momento", "Hace 5 min", etc.
- **Auto-refresh**: si hay inversiones con ticker y la última actualización es mayor a 15 min, se llama automáticamente al abrir la página.

## Variables de entorno

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `COINGECKO_API_KEY` | No | API key. Sin ella usa API pública (~30/min). Obtener en [CoinGecko](https://www.coingecko.com/en/api/pricing) |
| `COINGECKO_DEMO_API` | No | Si es `true`, usa **Demo API** (api.coingecko.com). Las keys que empiezan con `CG-` son Demo. Si es Pro (de pago), omitir o `false`. |

**Demo API (gratuita):** usa `api.coingecko.com` y header `x-cg-demo-api-key`.  
**Pro API (de pago):** usa `pro-api.coingecko.com` y header `x-cg-pro-api-key`.

En `backend/.env` (Demo key):
```
COINGECKO_DEMO_API=true
COINGECKO_API_KEY=CG-xxxxx
```

En `backend/.env` (Pro key o sin key):
```
# Sin COINGECKO_DEMO_API o =false
COINGECKO_API_KEY=cg_xxxxx
```

## Qué NO cubre CoinGecko

- **Acciones, ETFs** → [Yahoo Finance](YAHOO_FINANCE.md)
- **CETES, bonos** → sin API gratuita; `currentPrice` manual
