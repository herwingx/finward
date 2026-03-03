# Security Guidelines - Finward Backend

Documento de referencia para las medidas de seguridad implementadas tras la auditoría de seguridad (2025).

## 1. Balance de Cuentas (CRÍTICO)

**Regla:** El campo `balance` de una cuenta **NUNCA** debe ser editable directamente desde el cliente.

- El balance se calcula exclusivamente a partir de `LedgerEntry` (libro mayor de doble partida).
- En `accountRoutes.ts`, el `PUT /:id` no acepta `balance` en el cuerpo.
- Si se requiere reconciliación o ajuste, crear un endpoint específico que genere una transacción de ajuste con auditoría.

## 2. Validación de Ownership (IDOR Prevention)

Antes de modificar recursos referenciados por FKs (`accountId`, `categoryId`, etc.):

1. **RecurringTransaction:** `categoryId` y `accountId` se validan contra `userId` en POST y PUT.
2. **UpdateTransaction:** Se valida que `accountId` y `destinationAccountId` pertenezcan al usuario **antes** de revertir el impacto financiero.
3. **Loan:** `accountId` en creación y pago se valida contra `userId`.
4. **InstallmentPurchase:** `categoryId` en PUT se valida contra `userId`.

## 3. Input Validation

### Módulo `shared/validation.ts`

- **parseSafeFloat / parseSafeInt:** Evitan NaN e Infinity.
- **validateAmount / parseAndValidateAmount:** Rangos 0.01 .. 999,999,999.99.
- **validateMaxLength / validateDescription / validateName:** Límites de longitud para evitar DoS.
- **parsePaginationParams:** Parámetros de paginación seguros (take 1..500, skip >= 0).

### Campos validados

| Campo        | Límite              | Uso                                |
|--------------|---------------------|------------------------------------|
| amount       | 0.01 .. 999M        | Transacciones, préstamos, metas    |
| description  | 2000 caracteres     | Transacciones, MSI                 |
| name         | 200 caracteres      | Cuentas, categorías, metas         |
| notes        | 4000 caracteres     | Préstamos                          |
| take / skip  | take 1..500, skip≥0 | Paginación                         |

## 4. Paginación

- `GET /transactions` y `GET /transactions/deleted` devuelven `{ data, total, take, skip }`.
- Default: `take=100`, máximo `take=500`.
- Reduce riesgo de DoS por consultas que retornan millones de filas.

## 5. Background Jobs

- **snapshotBalances:** Ejecuta en `$transaction` para atomicidad.
- **generateStatements:** Manejo de errores por cuenta (no detiene el job completo).

## 6. RLS (Row Level Security)

- Las políticas en `rls-policies.sql` protegen accesos directos a Postgres (PostgREST, etc.).
- El backend usa Prisma con conexión que puede bypassear RLS; la autorización se implementa en capa de aplicación (`where: { userId }` en consultas).

## 7. Middleware de Autenticación

- `authMiddleware` extrae el JWT del header `Authorization: Bearer <token>`.
- Valida con Supabase Auth y establece `req.user = { id, email }`.
- Todas las rutas de API (excepto `/api/auth/*`) pasan por `authMiddleware`.

## 8. Índices de Base de Datos

- `Transaction`: `@@index([userId, deletedAt, date])` para consultas frecuentes filtradas por usuario y estado.
- Ejecutar `prisma db push` o crear migración para aplicar cambios en `schema.prisma`.

## Referencias

- `backend/prisma/rls-policies.sql`
- `backend/src/shared/validation.ts`
- `backend/src/shared/security.ts`
