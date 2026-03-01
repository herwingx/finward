# Seed - Datos de prueba para Finward

## ¿Qué es?

El seed crea datos de ejemplo para **probar todas las funcionalidades** de Finward en desarrollo. Incluye:

| Módulo | Datos creados |
|--------|---------------|
| User | Usuario demo con categorías por defecto |
| Accounts | Cuenta débito, efectivo, TDC (con corte y pago) |
| Transactions | Ingreso (salario), gastos (comida, TDC), transferencia |
| InstallmentPurchase | Compra a MSI (iPhone) en TDC |
| RecurringTransaction | Gasto recurrente (gasolina quincenal) |
| Loan | Préstamo prestado |
| CreditCardStatement | Corte pendiente en TDC |
| AccountSnapshot | Snapshot de balances |
| SavingsGoal | Meta de ahorro + aportación |
| Investment | Inversión (CETES) |
| Budget | Presupuesto mensual |
| Notification | Notificación de bienvenida |

## Requisitos

1. Usuario existente en **Supabase Auth** (Dashboard > Auth > Users).
2. `prisma db push` ya ejecutado.
3. `SEED_USER_ID` con el UUID del usuario.
4. `DIRECT_URL` o `DATABASE_URL` en `.env` (el seed usa `@prisma/adapter-pg` con conexión directa).

## Uso

### 1. Crear usuario en Supabase Auth

- Supabase Dashboard > Auth > Users > **Add user**
- Email: `demo@finward.dev` (o el que prefieras)
- Password: el que quieras
- Copia el **UUID** del usuario creado

### 2. Ejecutar seed

```bash
cd backend
SEED_USER_ID=<uuid-del-usuario> npm run db:seed
```

El seed usa `DIRECT_URL` (o `DATABASE_URL`) para conectarse vía `@prisma/adapter-pg`. Asegúrate de que `.env` tenga la conexión configurada (ej. `192.168.100.109:5433` para Tailscale).

O añade a `.env`:

```
SEED_USER_ID=00000000-0000-0000-0000-000000000001
```

Y luego:

```bash
npm run db:seed
```

### 3. Probar la app

Inicia sesión con ese usuario y explora:

- Dashboard con balance, transacciones
- Transacciones: listar, crear, editar, borrar, restaurar
- Cuentas: débito, efectivo, TDC
- MSI: ver cuotas, pagar
- Préstamos: listar, pagar, marcar pagado
- Metas: contribuir, retirar
- Inversiones
- Recurrentes
- Planificación financiera
- AI: contexto, safe-to-spend

## Via dev.sh

Desde la raíz de finward:

```bash
./dev.sh db:seed
```

(Requiere `SEED_USER_ID` en `backend/.env`)

## Idempotencia

El seed **añade** datos. Si lo ejecutas varias veces, se crearán registros adicionales. Para empezar desde cero:

1. Borra los datos en Supabase (SQL Editor o resetea el proyecto), o
2. Usa un usuario nuevo cada vez.

## Desarrollo

El seed es ideal para:

- Probar flujos completos sin datos manuales
- Demos
- QA de funcionalidades
- Onboarding de nuevos devs
