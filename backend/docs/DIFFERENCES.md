# Finward vs Finanzas Pro - Diferencias y Mejoras

Este documento explica las diferencias arquitectónicas, de diseño y funcionales entre Finward (nuevo backend) y Finanzas Pro (legacy).

---

## 1. Arquitectura

### Finanzas Pro (Legacy)
- Estructura plana: `routes/`, `controllers/`, `services/` globales
- Controladores separados de rutas
- Servicios monolíticos con múltiples responsabilidades
- Lógica de negocio dispersa en rutas y servicios

### Finward (Nuevo)
- **Clean Architecture modular**: cada dominio tiene su carpeta
  ```
  modules/{domain}/
    domain/      → Reglas de negocio puras
    useCases/    → Casos de uso (una acción = un archivo)
    infrastructure/ → Rutas REST, adaptadores
  ```
- Sin controladores genéricos: las rutas delegan directamente a use cases
- Código autodocumentado: `CreateExpenseUseCase`, `PayInstallmentUseCase`
- Separación clara: dominio → casos de uso → infraestructura

---

## 2. Autenticación y Base de Datos

### Finanzas Pro (Legacy)
- Auth manual con JWT propio o middleware custom
- User con `password` en DB (credenciales en backend)
- Validaciones de `userId` manuales en cada ruta

### Finward (Nuevo)
- **Supabase Auth nativo**: JWT de Supabase, `auth.uid()` en RLS
- User sin `password`: auth delegada a Supabase
- RLS en Postgres: `auth.uid() = user_id` filtra automáticamente
- Menos código de validación: Postgres hace el filtrado

---

## 3. Contabilidad (Ledger)

### Finanzas Pro (Legacy)
- Balance calculado vía `increment`/`decrement` en `Account`
- Riesgo de desincronización si hay errores parciales
- Sin trazabilidad de movimientos

### Finward (Nuevo)
- **Ledger de doble partida**: cada transacción genera `LedgerEntry` con suma 0
- Balance = `SUM(amount)` de LedgerEntries por cuenta
- Trazabilidad completa: cada cambio tiene entrada en ledger
- Consistencia: transacciones atómicas con Prisma

---

## 4. Tarjetas de Crédito y MSI

### Finanzas Pro (Legacy)
- Lógica de corte/pago en controlador grande (~400 líneas)
- Cálculo de MSI y pagos mezclado con UI/HTTP
- Self-healing manual para corregir desincronizaciones

### Finward (Nuevo)
- **domain/billingCycle.ts**: cálculo de ciclos puro
- **domain/nextPaymentDate.ts**: próxima cuota MSI
- Use cases: `CreateInstallmentPurchaseUseCase`, `PayInstallmentUseCase`
- Pagos de corte y MSI vía `createTransfer` + Ledger

---

## 5. Transacciones Recurrentes

### Finanzas Pro (Legacy)
- Lógica de frecuencia compleja (biweekly_15_30, etc.)
- Cálculo de próximas fechas en servicio compartido

### Finward (Nuevo)
- **domain/nextDueDate.ts**: cálculo de siguiente vencimiento
- Pay/Skip como endpoints explícitos
- Integración con CreateIncome/CreateExpense (recurringTransactionId)

---

## 6. Inversiones

### Finanzas Pro (Legacy)
- Controlador separado, crea transacción de gasto si `sourceAccountId`

### Finward (Nuevo)
- Módulo `investments/` con rutas limpias
- Misma lógica: crear Investment + opcionalmente CreateExpense
- Categoría "Inversiones" creada bajo demanda
- **CoinGecko**: `POST /investments/refresh-prices` actualiza `currentPrice` en crypto (ticker = CoinGecko ID). Ver [COINGECKO.md](COINGECKO.md)

---

## 7. Planificación Financiera

### Finanzas Pro (Legacy)
- Controlador ~1000 líneas con lógica de períodos, MSI, 50/30/20
- Mucha lógica de fechas y timezone
- Warnings y budget analysis integrados

### Finward (Nuevo)
- **Versión simplificada**: summary + upcoming
- Períodos: semanal, quincenal, mensual, bimestral, semestral, anual
- Sin 50/30/20 complejo: datos crudos para que el frontend analice

---

## 8. Notificaciones y Perfil

### Finanzas Pro (Legacy)
- Notificaciones con SmartAlertService
- Profile con multer para avatar (uploads locales)

### Finward (Nuevo)
- Notificaciones: CRUD simple, marcado read/read-all
- Profile: Supabase Storage para avatar (ver docs/STORAGE.md)
- Sin multer: uploads 100% en Supabase Storage

---

## 9. Uploads

### Finanzas Pro (Legacy)
- multer + carpeta `uploads/` en servidor

### Finward (Nuevo)
- **Supabase Storage**: buckets públicos/privados
- Ningún archivo en el servidor Node
- Ver `docs/STORAGE.md`

---

## 10. Resumen de Mejoras

| Aspecto | Finanzas Pro | Finward |
|---------|--------------|---------|
| Estructura | routes/controllers/services | modules/domain/useCases/infrastructure |
| Auth | Manual, password en DB | Supabase Auth, RLS |
| Contabilidad | increment/decrement | Ledger doble partida |
| Validación | Manual en cada ruta | RLS + AppError centralizado |
| MSI/Cortes | Controlador grande | Domain + Use Cases |
| Uploads | multer local | Supabase Storage |
| Deuda técnica | Alta | Cero (reenfoque completo) |
