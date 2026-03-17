# Cálculos Financieros - Finward Backend

Este documento define todas las fórmulas y reglas de cálculo usadas en el backend para garantizar consistencia y precisión.

---

## 1. Redondeo y Precisión

- **Regla:** Todos los montos monetarios se redondean a 2 decimales.
- **Implementación:** `Math.round(n * 100) / 100` (función `round2` interna).
- **Evitar:** `parseFloat((x).toFixed(2))` puede introducir errores de punto flotante en sumas iterativas.

---

## 2. Ledger (Doble Partida)

### Balance de cuenta

```
balance(cuenta) = SUM(LedgerEntry.amount) WHERE accountId = cuenta
```

- **Crédito (type=credit):** `amount` positivo aumenta saldo en cuentas activas, reduce deuda en CREDIT/LOAN.
- **Débito (type=debit):** `amount` negativo hace lo contrario.

### Regla de sumatoria

- Por transacción: `SUM(amount)` de todas las entradas relacionadas = 0.

### Cuenta cache

- El campo `Account.balance` es un cache actualizado en cada transacción.
- Nunca se modifica directamente; siempre vía `LedgerEntry` + `increment`.

---

## 3. MSI (Meses Sin Intereses)

### Cuota mensual

```
monthlyPayment = FLOOR(totalAmount / installments * 100) / 100
```

- Se trunca hacia abajo para que la **última cuota absorba el resto**.
- Última cuota: `lastInstallmentAmount = totalAmount - (installments - 1) * monthlyPayment`

### Proyección de fechas

- **Sin TDC (cutoff):** `paymentDate[n] = purchaseDate + (n - 1) meses` (preservando día, con overflow mes → último día).
- **Con TDC:** `cutoffDay` y `daysToPayAfterCutoff` determinan la fecha de pago por ciclo de facturación.

### paidInstallments

- Solo se incrementa cuando se paga **al menos una cuota completa**.
- `installmentsCovered = FLOOR(amount / monthlyPayment)`
- Pagos parciales no cuentan como cuota pagada (evita desfase en proyección MSI).

---

## 4. Balances Financieros (`computeFinancialBalances`)

| Concepto | Fórmula |
|----------|---------|
| **availableFunds** | Suma de balances de cuentas DEBIT, CASH, SAVINGS |
| **totalAssets** | Cuentas no-deuda (CASH, DEBIT, INVESTMENT, SAVINGS) + inversiones + metas + préstamos prestados (lent) |
| **totalLiabilities** | Cuentas CREDIT, LOAN (abs(balance)) + préstamos recibidos (borrowed) |
| **netWorth** | totalAssets - totalLiabilities |

- Cuentas con `includeInNetWorth: false` no se suman en activos/pasivos.

---

## 5. Proyección de Flujo (Financial Planning)

### Recurrentes

- `expandRecurringInPeriod(recurring, periodStart, periodEnd)` genera eventos por cada fecha de vencimiento en el período.
- Frecuencias soportadas: `daily`, `weekly`, `biweekly`, `monthly`, `bimonthly`, `yearly`.
- `addMonthsPreservingDay(base, n)`: evita overflow (ej. 31 ene + 1 mes = 28 feb, no 3 mar).

### MSI

- `expandMsiInPeriod(purchase, periodStart, periodEnd)` genera eventos por cuota pendiente cuya fecha cae en el período.
- Monto de última cuota: `remaining - (unpaidCount - 1) * monthlyPayment` (redondeado).

### Préstamos

- Se incluyen en expectedIncome/expectedExpenses según `expectedPayDate` y `loanType` (lent → income, borrowed → expense).

### Saldo proyectado

```
projectedBalance = availableFunds + totalPeriodIncome - totalCommitments
totalCommitments = expenseTotal + totalExpectedExpenses + totalMSIPayments
```

### Disposable income

```
disposableIncome = totalPeriodIncome - totalCommitments
```

---

## 6. Préstamos (Loans)

- **remainingAmount:** Se decrementa con cada pago.
- **status:** `active` (no pagado), `partial` (pagado parcialmente), `paid` (remainingAmount ≤ 0).
- Umbral para "paid": `newRemaining <= 0` o `newRemaining >= originalAmount - 0.01` (tolerancia por redondeo).

---

## 7. Metas de Ahorro (Goals)

- **contribute:** `currentAmount += amount`, crea transacción expense (sale de cuenta → meta).
- **withdraw:** `currentAmount -= amount`, crea transacción income (meta → cuenta).
- No se permite retirar más de `currentAmount`.

---

## 8. Validación de Entrada

- **Montos:** `MIN_AMOUNT` (0.01) ≤ amount ≤ `MAX_AMOUNT` (999_999_999.99).
- **Fechas:** `parseAndValidateDate` rechaza fechas inválidas (NaN).
- **IDs:** Opcional `validateUuid` para parámetros de ruta.

---

## 9. Estados de Cuenta TDC

- **MSI en el ciclo:** `getMsiAmountForBillingCycle(installments, cycle)` usa `expandMsiInPeriod` con `cycle.cycleStartDate` y `cycle.paymentDate`.
- Solo incluye cuotas cuyo vencimiento cae dentro del período de pago.
