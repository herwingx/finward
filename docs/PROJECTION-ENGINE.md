# Motor de Proyección Financiera

## Descripción

El motor de proyección expande todos los compromisos financieros en una línea temporal para calcular el flujo de caja futuro.

Tambien unifica los indicadores que se muestran en Dashboard y Proyeccion.

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
| Préstamos | Incluidos si `expectedPayDate` cae en el período (tambien vencidos) |
| Tarjetas crédito (regular) | Se calcula saldo regular pendiente del ciclo (compras - abonos) |

## Normalización de Fechas

- **`addMonthsPreservingDay()`** (nextDueDate.ts): 31 Ene + 1 mes = 28/29 Feb (no 3 Mar).
- **`getPaymentDateForInstallment()`** (nextPaymentDate.ts): usa `setDaySafe()` para corte y luego suma `daysToPayAfterCutoff` para el vencimiento real.

## Parámetros

- **period**: semanal, quincenal, mensual, bimestral, semestral, anual
- **mode**: `calendar` o `projection`

## Reglas de Intervalo

- **Quincenal**: siempre usa quincena calendario.
- Si hoy esta del 1 al 15: rango = 1 al 15.
- Si hoy esta del 16 al fin de mes: rango = 16 al ultimo dia del mes.
- **Bimestral**:
- `calendar`: mes actual + siguiente completo.
- `projection`: desde hoy hasta hoy + 2 meses.

## Formulas del Resumen

- **availableFunds**: suma de cuentas liquidas `DEBIT + CASH + SAVINGS`.
- **totalAssets**: cuentas no deuda + valor de inversiones + ahorro en metas + prestamos que te deben (`loanType=lent`).
- **totalLiabilities**: cuentas de deuda (`CREDIT + LOAN`) + prestamos que debes (`loanType=borrowed`).
- **netWorth**: `totalAssets - totalLiabilities`.
- **totalExpectedIncome**: ingresos esperados (recurrentes + prestamos lent con vencimiento en periodo).
- **totalExpectedExpenses**: gastos esperados (recurrentes + prestamos borrowed con vencimiento en periodo + pagos regulares de TDC).
- **totalMSIPayments**: cuotas MSI proyectadas en el periodo.
- **totalPeriodIncome**: ingresos reales del periodo + esperados; si existe `monthlyNetIncome`, usa el mayor entre ambos.
- **totalCommitments**: gastos reales + gastos esperados + MSI.
- **disposableIncome**: `totalPeriodIncome - totalCommitments`.
- **projectedBalance**: `availableFunds + totalPeriodIncome - totalCommitments`.
- **isSufficient**: `projectedBalance >= 0`.

## Estrategia de Tarjetas de Credito

- En vez de guardar un "dia fijo de pago", la tarjeta guarda:
- `cutoffDay` (dia de corte)
- `daysToPayAfterCutoff` (dias naturales para pagar)

De esta forma, el vencimiento se calcula robustamente para meses de 28, 30 o 31 dias:

`paymentDate = cutoffDate + daysToPayAfterCutoff`

Ejemplo:
- Corte 15 de marzo, 20 dias para pagar -> pago 4 de abril.
- Corte 15 de marzo, 30 dias para pagar -> pago 14 de abril.

## Respuesta

Incluye `expectedIncome`, `expectedExpenses`, `msiPaymentsDue` (con `accountId`, `accountName`, `originalId`, `uniqueId`); `availableFunds`, `totalAssets`, `totalLiabilities`, `netWorth`; `budgetAnalysis` (50/30/20); `isSufficient`, `warnings`.

Los balances (`availableFunds`, `totalAssets`, `totalLiabilities`, `netWorth`) provienen de `computeFinancialBalances()` en `financialBalances.ts`, que unifica cuentas, inversiones, metas y préstamos.
