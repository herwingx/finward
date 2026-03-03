# CoinGecko API - Precios Crypto

## Propósito y función

CoinGecko se usa para **actualizar automáticamente el precio actual** (`currentPrice`) de las inversiones tipo **CRYPTO** en Finward. La API no lista ni busca monedas; solo provee precios cuando ya tienes una inversión registrada con su CoinGecko ID.

**Flujo:** (1) Creas inversión con `type: "CRYPTO"` y `ticker` = CoinGecko ID (ej. `bitcoin`). (2) Llamas a `POST /api/investments/refresh-prices`. (3) El backend consulta CoinGecko en lote y actualiza `currentPrice` en la BD.

Para **acciones y ETFs**, ver [YAHOO_FINANCE.md](YAHOO_FINANCE.md).

## Gratis, uso personal

- **Sin API key**: API pública, ~30 llamadas/minuto
- **Con API key** (opcional): `COINGECKO_API_KEY` en `.env` → Pro API, rate limit mayor
- **Uso**: personal, no comercial (ver [Términos CoinGecko](https://www.coingecko.com/en/api_terms))

## Cómo agregar cripto en la app

No hay buscador de monedas. Debes ingresar el **CoinGecko ID** en el campo **Ticker** al crear/editar:

1. Inversiones → Nuevo Activo
2. Tipo **Cripto**
3. **Nombre**: ej. "Bitcoin"
4. **Ticker**: CoinGecko ID en minúsculas (ej. `bitcoin`, `ethereum`)
5. Cantidad, Precio compra, guardar

Tras guardar, `refresh-prices` actualiza los precios desde CoinGecko.

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

**Endpoint:** `POST /api/investments/refresh-prices` (sin body ni query).

```http
POST /api/investments/refresh-prices
Authorization: Bearer <token>
```

**Respuesta:** `{ updated, crypto, stock }` (updated = inversiones actualizadas).

**Implementación backend:** `backend/src/lib/coingecko.ts` → `fetchPrices(ids, vsCurrency)`. La ruta en `investmentRoutes.ts` agrupa todas las crypto del usuario, hace una llamada batch a CoinGecko `/simple/price?ids=...&vs_currencies=mxn`, y actualiza cada inversión con el precio devuelto.

### Frontend (InvestmentsPage)

- **Botón "Actualizar precios"**: actualización manual. Llama al endpoint e invalida la query de inversiones. Muestra toast al completar.
- **Indicador "Actualizado hace X min"**: usa el `lastPriceUpdate` más reciente de inversiones con ticker (crypto o stock). Muestra "Hace un momento", "Hace 5 min", etc.
- **Auto-refresh**: si hay inversiones con ticker y la última actualización es mayor a 15 min, se llama automáticamente al abrir la página.

## Variables de entorno

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `COINGECKO_API_KEY` | No | API key Pro. Sin ella usa API pública (~30/min). Obtener en [CoinGecko Pricing](https://www.coingecko.com/en/api/pricing) |

En `backend/.env`:
```
COINGECKO_API_KEY=cg_xxxxx
```

## Qué NO cubre CoinGecko

- **Acciones, ETFs** → [Yahoo Finance](YAHOO_FINANCE.md)
- **CETES, bonos** → sin API gratuita; `currentPrice` manual
