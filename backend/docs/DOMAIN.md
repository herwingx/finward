# Dominio Financiero - Finward

Este documento define el propósito, entidades y reglas de negocio del backend.

---

## Propósito de la Aplicación

**Finward** es una app **B2C** de finanzas personales. Cada usuario gestiona su propia información financiera. No hay multitenancy ni workspaces: **1 usuario = 1 cuenta personal**.

---

## Entidades Principales

### User / Profile

- Usuario autenticado por Supabase Auth (`auth.users`).
- Datos de perfil: nombre, moneda (MXN), timezone (America/Mexico_City).
- Opcional: ingreso mensual, frecuencia de ingresos, score financiero.
- `userId` en todas las tablas = `auth.uid()` de Supabase.

### Account

Cuenta financiera del usuario.

| Tipo      | Significado        | Balance                            |
|----------|--------------------|------------------------------------|
| CASH     | Efectivo           | Activo (positivo = dinero disponible) |
| DEBIT    | Cuenta de débito   | Activo (positivo)                  |
| CREDIT   | Tarjeta de crédito | Pasivo (positivo = deuda)          |
| LOAN     | Préstamo           | Pasivo (positivo = deuda)          |
| INVESTMENT| Inversión         | Activo                             |
| SAVINGS  | Ahorro             | Activo                             |

- `cutoffDay`, `paymentDay`: Para TDC (ej. corte día 15, pago día 5).
- `creditLimit`: Para TDC.
- `balance`: Cache del balance actual (actualizado vía Ledger).

### Transaction

Registro de una operación financiera.

- `type`: income | expense | transfer
- `amount`: Monto (siempre positivo).
- `description`, `date`, `status` (completed | pending).
- `accountId`, `destinationAccountId` (transferencias).
- `categoryId`: Categoría del gasto/ingreso.
- `installmentPurchaseId`, `loanId`, `recurringTransactionId`, `statementId`: Vínculos.

### LedgerEntry (Nuevo - Doble Partida)

Cada transacción genera 2+ entradas en el Ledger que suman 0 (débitos = créditos).

| Campo         | Descripción                              |
|---------------|------------------------------------------|
| accountId     | Cuenta afectada                          |
| transactionId | Transacción origen                       |
| amount        | + = crédito, - = débito                  |
| type          | debit | credit                          |

**Reglas:**
- Suma de `amount` por transacción = 0.
- Balance de cuenta = `SUM(amount)` de sus LedgerEntries.

### Category

Categoría de gasto/ingreso (ej. Alimentación, Transporte). `type`: income | expense. `budgetType`: needs | wants | savings.

### InstallmentPurchase (MSI)

Compra a meses sin intereses.

- `totalAmount`, `installments`, `monthlyPayment`, `purchaseDate`.
- `paidInstallments`, `paidAmount`: Progreso del pago.
- Cada cuota mensual genera una transacción de pago (transferencia a la TDC).

### Loan

Préstamo (me deben / debo). `loanType`: lent | borrowed. `originalAmount`, `remainingAmount`, `status` (active | partial | paid).

### CreditCardStatement

Estado de cuenta de TDC generado en el día de corte.

- `cycleStart`, `cycleEnd`, `paymentDueDate`.
- `totalDue`, `minimumPayment`, `regularAmount`, `msiAmount`.
- `status`: PENDING | PAID | PARTIAL | OVERDUE.

### AccountSnapshot

Balance de una cuenta en una fecha (para gráficas de evolución). Job diario 23:55.

### SavingsGoal

Meta de ahorro. `targetAmount`, `currentAmount`, `deadline`.

---

## Reglas de Negocio

### Ledger de Doble Partida

1. **Gasto con efectivo/débito:** -Account (débito), +Gasto (o categoría).
2. **Gasto con TDC:** +Pasivo TDC (crédito = aumenta deuda), +Gasto. No toca banco.
3. **Pago de TDC:** -Banco (débito), -Pasivo TDC (débito = reduce deuda).
4. **Transferencia:** -Origen, +Destino.
5. **Ingreso:** +Cuenta, +Categoría ingreso.

### Ciclos de Corte (TDC)

- `cutoffDay`: Día de corte (ej. 15).
- `paymentDay`: Día límite de pago (ej. 5).
- Ciclo: desde día después del corte anterior hasta el día de corte actual.
- Job diario 00:05: genera `CreditCardStatement` para cuentas cuyo `cutoffDay` = hoy.

### MSI (Meses Sin Intereses)

- Cada cuota se carga el mismo día del mes que la compra.
- La cuota mensual genera una transacción de transferencia (banco → TDC) cuando el usuario la paga.
- Job de statements suma `monthlyPayment` de MSI activos al `totalDue` del ciclo.

---

## Flujos Principales

1. **Crear gasto:** Validar cuenta, categoría → crear Transaction → crear LedgerEntries (débito cuenta, crédito gasto) → actualizar balance cache.
2. **Pagar TDC:** Validar origen y destino → crear Transaction (transfer) → LedgerEntries → actualizar balances.
3. **Pago MSI:** Crear transfer con `installmentPurchaseId` → actualizar `paidInstallments`, `paidAmount`.
4. **Corte diario:** Job identifica TDC con cutoff=hoy → calcula totalDue (gastos + MSI) → crea CreditCardStatement.
