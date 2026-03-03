# Yahoo Finance - Precios Acciones y ETFs

## Propósito y función

Yahoo Finance se usa para **actualizar automáticamente el precio actual** (`currentPrice`) de las inversiones tipo **STOCK** (acciones, ETFs, índices) en Finward. Se usa la librería no oficial [yahoo-finance2](https://github.com/gadicc/yahoo-finance2).

**Flujo:**
1. Creas una inversión manualmente con `type: "STOCK"` y `ticker` = símbolo Yahoo (ej. `NVDA`, `AAPL`).
2. Llamas a `POST /api/investments/refresh-prices` (junto con CoinGecko para crypto).
3. El backend consulta Yahoo Finance por cada símbolo, actualiza `currentPrice` y `lastPriceUpdate` en la BD.

Para **criptomonedas**, ver [COINGECKO.md](COINGECKO.md).

---

## Uso en la app: Cómo agregar acciones/ETFs

No existe buscador de símbolos en el frontend. Debes ingresar el **símbolo Yahoo** manualmente en el campo **Ticker** al crear/editar una inversión:

1. Ir a **Inversiones** → **Nuevo Activo**
2. Seleccionar tipo **Acciones** (o el que corresponda)
3. **Nombre**: ej. "NVIDIA"
4. **Ticker**: usar el **símbolo Yahoo**, ej. `NVDA`, `AAPL`
5. Cantidad, Precio compra, Precio actual (opcional)
6. Guardar

Tras guardar, al ejecutar **refresh-prices** se actualizarán los precios desde Yahoo Finance.

---

## Símbolos comunes (Yahoo)

| Asset            | Ticker Yahoo  |
|------------------|---------------|
| NVIDIA           | `NVDA`        |
| Apple            | `AAPL`        |
| Microsoft        | `MSFT`        |
| Amazon           | `AMZN`        |
| Google (Alphabet)| `GOOGL`       |
| Tesla            | `TSLA`        |
| S&P 500          | `^GSPC`       |
| NASDAQ           | `^IXIC`       |
| América Móvil    | `AMXL.MX`     |
| Cemex            | `CEMEXCPO.MX` |
| GFNorte          | `GFNORTE.MX`  |

**Búsqueda:** [finance.yahoo.com](https://finance.yahoo.com/) → buscar la acción y copiar el símbolo (ej. AAPL, AMXL.MX).

---

## Integración técnica

### Endpoint

```http
POST /api/investments/refresh-prices
Authorization: Bearer <token>
```

Sin body ni query params. El mismo endpoint actualiza tanto crypto (CoinGecko) como stock (Yahoo) en una sola llamada.

### Respuesta

```json
{ "updated": 5, "crypto": 3, "stock": 2 }
```

### Implementación

- **Backend:** `backend/src/lib/yahooFinance.ts` → `fetchStockPrice(symbol)`
- **Ruta:** `backend/src/modules/investments/infrastructure/investmentRoutes.ts` → `POST /refresh-prices`
- **Librería:** `yahoo-finance2` → `client.quote(symbol)` para obtener `regularMarketPrice`

Las solicitudes de stock se ejecutan en paralelo (`Promise.all`) para cada inversión con ticker.

### Frontend (InvestmentsPage)

El mismo endpoint se usa para crypto y stock. Ver [COINGECKO.md](COINGECKO.md) sección "Frontend" para botón "Actualizar precios", indicador "Actualizado hace X min" y auto-refresh si datos >15 min desactualizados.

---

## Moneda

- **Acciones US:** precios en USD; el campo `currency` de la inversión puede ser `USD` o `MXN` según cómo quieras valorar.
- **BMV (México):** sufijo `.MX` (ej. `AMXL.MX`) → precios en MXN.

El precio que devuelve Yahoo se guarda tal cual en `currentPrice`; la conversión a MXN (si la hubiera) depende del esquema del frontend/dominio.

---

## Variables de entorno

**Ninguna.** Yahoo Finance no requiere API key. La librería `yahoo-finance2` usa endpoints públicos de Yahoo.

---

## Limitaciones y consideraciones

- **API no oficial:** Yahoo no ofrece API pública oficial; la librería puede romperse si Yahoo cambia su estructura.
- **Uso personal:** Recomendado para uso personal, no comercial.
- **Errores silenciosos:** Si un símbolo falla, se registra en logs pero no interrumpe el resto; esa inversión no se actualiza.
