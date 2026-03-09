# Motor de Proyección Financiera

## Descripción

El motor de proyección expande todos los compromisos financieros en una línea temporal para calcular el flujo de caja futuro.

## Componentes

- **`backend/src/modules/financial-planning/domain/projectionEngine.ts`**  
  Expande recurrentes, MSI y préstamos en eventos con fechas.

- **`backend/src/modules/financial-planning/useCases/GetFinancialSummaryUseCase.ts`**  
  Construye el resumen completo consumiendo el motor.

## Eventos Proyectados

| Fuente | Expansión |
|--------|-----------|
| Recurrentes | `expandRecurringInPeriod()` — itera desde `nextDueDate` respetando `endDate` y frecuencia |
| MSI | `expandMsiInPeriod()` — usa `getPaymentDateForInstallment()` para cada cuota pendiente |
| Préstamos | Incluidos si `expectedPayDate` cae en el período |

## Normalización de Fechas

- **`addMonthsPreservingDay()`** (nextDueDate.ts): 31 Ene + 1 mes = 28/29 Feb (no 3 Mar).
- **`getPaymentDateForInstallment()`** (nextPaymentDate.ts): usa `setDaySafe()` para cutoffDay/paymentDay en meses cortos.

## Parámetros

- **period**: semanal, quincenal, mensual, bimestral, semestral, anual
- **mode**: `calendar` — período estándar; `projection` — quincenal amplía a 30 días para vista de proyección

## Respuesta

Incluye `expectedIncome`, `expectedExpenses`, `msiPaymentsDue` (con `accountId`, `accountName`, `originalId`, `uniqueId`); `availableFunds`, `totalAssets`, `totalLiabilities`, `netWorth`; `budgetAnalysis` (50/30/20); `isSufficient`, `warnings`.

Los balances (`availableFunds`, `totalAssets`, `totalLiabilities`, `netWorth`) provienen de `computeFinancialBalances()` en `financialBalances.ts`, que unifica cuentas, inversiones, metas y préstamos.
