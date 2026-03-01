# API Reference - Finward Backend

## Swagger

Documentación interactiva disponible en `GET /api-docs` cuando el servidor está corriendo.

## Autenticación

Todas las rutas protegidas requieren header:

```
Authorization: Bearer <supabase_jwt>
```

El JWT debe ser válido (Supabase Auth). El backend valida con `supabase.auth.getUser()` y establece `req.user.id`.

## Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/transactions | Listar transacciones |
| POST | /api/transactions | Crear transacción (income/expense/transfer) |
| GET | /api/accounts | Listar cuentas |
| POST | /api/accounts | Crear cuenta |
| GET | /api/categories | Listar categorías |
| POST | /api/categories | Crear categoría |
| GET | /api/credit-card/statement/:accountId | Estado de cuenta TDC |
| GET | /api/loans | Listar préstamos |
| POST | /api/loans | Crear préstamo |
| GET | /api/goals | Listar metas de ahorro |
| POST | /api/goals | Crear meta |

## Códigos de Error

- 400 - Bad Request (validación)
- 401 - Unauthorized (token inválido o faltante)
- 404 - Not Found
- 500 - Internal Server Error
