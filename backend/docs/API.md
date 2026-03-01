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

### Auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/refresh | Refrescar sesión JWT |

### Profile
| GET | PUT | /api/profile | Obtener/crear perfil | Actualizar perfil |
| POST | /api/profile/avatar/upload-url | Obtener signed upload URL (Supabase Storage profile-pictures) |
| GET | /api/profile/avatar-url | Obtener signed URL para mostrar foto de perfil |

### Transactions, Accounts, Categories
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET, POST | /api/transactions | Listar, crear transacciones |
| GET | /api/transactions/deleted | Listar transacciones borradas |
| GET, PUT, DELETE | /api/transactions/:id | Obtener, actualizar, borrar (soft) |
| POST | /api/transactions/:id/restore | Restaurar transacción borrada |
| GET, POST | /api/accounts | Listar, crear cuentas |
| GET, POST | /api/categories | Listar, crear categorías |

### Credit Cards
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/credit-card/statement/:accountId | Estado de cuenta TDC |
| POST | /api/credit-card/statement/:accountId/pay | Pagar corte |
| POST | /api/credit-card/msi/:installmentId/pay | Pagar cuota MSI |
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
| POST | /api/investments/refresh-prices | Actualizar precios crypto (CoinGecko) + stock (Yahoo Finance) |
| GET, POST | /api/recurring | CRUD recurrentes + pay/skip |
| GET | /api/financial-planning/summary | Resumen período |
| GET | /api/financial-planning/upcoming | Próximos compromisos |
| GET, PUT | /api/notifications | Listar, marcar leídas |

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

- 400 - Bad Request (validación)
- 401 - Unauthorized (token inválido o faltante)
- 404 - Not Found
- 500 - Internal Server Error
