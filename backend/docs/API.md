# API Reference - Finward Backend

## Swagger

Documentación interactiva disponible en `GET /api-docs` cuando el servidor está corriendo.

## Autenticación

Todas las rutas protegidas requieren header:

```
Authorization: Bearer <supabase_jwt>
```

El JWT debe ser válido (Supabase Auth). El backend valida con `supabase.auth.getUser()` y establece `req.user.id`.

## Endpoints

### Auth (públicos, sin Bearer)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/auth/status | Health check del servicio auth |
| POST | /api/auth/login | Login con email y contraseña (Supabase Auth) |
| POST | /api/auth/register | Crear cuenta (Supabase Auth) |
| POST | /api/auth/request-reset | Solicitar restablecimiento de contraseña |
| POST | /api/auth/reset-password | Restablecer contraseña con token de recovery |
| POST | /api/auth/refresh | Refrescar sesión JWT (requiere Bearer) |

### Profile
| GET | PUT | /api/profile | Obtener/crear perfil | Actualizar perfil |

**GET /api/profile** crea el usuario en Prisma si no existe, o sincroniza el id cuando el usuario existe por email pero con id distinto (Supabase Auth cambió). Esto evita 500 por desincronización Auth↔Prisma.
| POST | /api/profile/avatar/upload-url | Obtener signed upload URL (Supabase Storage profile-pictures) |
| GET | /api/profile/avatar-url | Obtener signed URL para mostrar foto de perfil |

### Transactions, Accounts, Categories
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET, POST | /api/transactions | Listar (paginado), crear transacciones |
| GET | /api/transactions/deleted | Listar transacciones borradas (paginado) |

**Paginación:** `GET /transactions` y `GET /transactions/deleted` aceptan `?take=100&skip=0` (take: 1-500, default 100). Respuesta: `{ data: Transaction[], total, take, skip }`.

**Importante:** El balance de cuentas no es editable vía `PUT /accounts/:id`; se calcula desde el libro mayor.
| GET, PUT, DELETE | /api/transactions/:id | Obtener, actualizar, borrar (soft) |
| POST | /api/transactions/:id/restore | Restaurar transacción borrada |
| GET, POST | /api/accounts | Listar, crear cuentas |
| GET, POST | /api/categories | Listar, crear categorías |

### Credit Cards
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/credit-card/statement/:accountId | Estado de cuenta TDC (regular + MSI del ciclo, solo cuotas con vencimiento en el período) |
| POST | /api/credit-card/statement/:accountId/pay | Pagar corte. Body: `{ sourceAccountId, amount, date? }` |
| POST | /api/credit-card/msi/:installmentId/pay | Pagar cuota MSI. Body: `{ sourceAccountId, date? }` |
| POST | /api/credit-card/revert/:transactionId | Revertir pago TDC (soft delete) |

### Installments (MSI)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET, GET/:id | /api/installments | Listar, obtener MSI |
| POST | /api/installments | Crear compra MSI |
| PUT, DELETE | /api/installments/:id | Actualizar, eliminar MSI (opción revert=true) |
| POST | /api/installments/:id/pay | Pagar cuota |

### Investments, Recurring, Financial Planning, Notifications
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET, POST | /api/investments | CRUD inversiones |
| GET | /api/investments/coins/top?limit=50 | Top criptos (select). Query: `limit`. Resp: `{ coins: [...] }` |
| GET | /api/investments/coins/search?q= | Buscar criptos (CoinGecko). Query: `q`. Resp: `{ coins: [...] }` |
| GET | /api/investments/coins/price?id= | Precio crypto (CoinGecko). Query: `id`. Resp: `{ id, price }` |
| GET | /api/investments/stocks/search?q= | Buscar acciones/ETFs (Yahoo Finance). Query: `q`. Resp: `{ quotes: [...] }` |
| GET | /api/investments/stocks/price?symbol= | Precio acción (Yahoo Finance). Query: `symbol`. Resp: `{ symbol, price, currency }` |
| POST | /api/investments/refresh-prices | Actualizar precios crypto (CoinGecko) + stock (Yahoo Finance). Sin body. Resp: `{ updated, crypto, stock }`. Ver [COINGECKO.md](COINGECKO.md), [YAHOO_FINANCE.md](YAHOO_FINANCE.md) |
| GET, POST | /api/recurring | CRUD recurrentes + pay/skip |
| GET | /api/financial-planning/summary | Resumen período (period, mode) |
| GET | /api/financial-planning/upcoming | Próximos compromisos |

**financial-planning/summary** — Query: `?period=semanal|quincenal|mensual|bimestral|semestral|anual` y `?mode=calendar|projection`. Devuelve: `expectedIncome[]`, `expectedExpenses[]`, `msiPaymentsDue[]` (con `accountId`, `accountName` por TDC), `totalPeriodIncome`, `totalCommitments`, `disposableIncome`, `projectedBalance`, `availableFunds`, `totalAssets`, `totalLiabilities`, `netWorth`, `budgetAnalysis` (needs/wants/savings), `isSufficient`, `warnings`. Ver `docs/PROJECTION-ENGINE.md`.
| GET, PUT | /api/notifications | Listar, marcar leídas |
| POST | /api/notifications/debug-trigger | (Solo dev) Crear notificación de prueba. Requiere `NODE_ENV=development` o `ENABLE_DEBUG_NOTIFICATIONS=true` |

### Loans
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/loans/summary | Resumen de préstamos |
| GET, POST | /api/loans | Listar, crear préstamos |
| GET, PUT, DELETE | /api/loans/:id | Obtener, actualizar, eliminar |
| POST | /api/loans/:id/payment | Registrar pago |
| POST | /api/loans/:id/mark-paid | Marcar como pagado |

### Goals
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET, POST | /api/goals | Listar, crear metas |
| PUT, DELETE | /api/goals/:id | Actualizar, eliminar |
| POST | /api/goals/:id/contribute | Contribuir a meta |
| POST | /api/goals/:id/withdraw | Retirar de meta |

### AI
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/ai/context | Resumen financiero (net worth, burn rate, runway, etc.) |
| GET | /api/ai/query/safe-to-spend | Calcular gasto seguro |

## Códigos de Error

| Código | Significado |
|--------|-------------|
| 400 | Bad Request (validación, referencia FK inválida) |
| 401 | Unauthorized (token inválido o faltante) |
| 404 | Not Found (registro no encontrado) |
| 409 | Conflict (registro duplicado, unique constraint) |
| 500 | Internal Server Error |

Las respuestas de error usan `{ error: string, code?: string }`. El frontend muestra `error` al usuario.

## Documentación adicional

- [CALCULATIONS.md](CALCULATIONS.md) — Fórmulas y reglas de cálculo (MSI, ledger, balances, proyección)
- [DOMAIN.md](DOMAIN.md) — Entidades y reglas de negocio
