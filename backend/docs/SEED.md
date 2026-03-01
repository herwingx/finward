# Seed - Datos de prueba para Finward

## Opción fácil: setup-dev (recomendado)

```bash
./dev.sh setup-dev
```

Crea usuario auth demo, ejecuta seed y aplica RLS. **No necesitas SEED_USER_ID.**

**Credenciales demo:**
- Email: `demo@finward.dev`
- Password: `DemoFinward123!`

---

## Opción manual: solo seed

Si ya tienes un usuario en Supabase Auth:

1. Añade `SEED_USER_ID=<uuid>` a `backend/.env`
2. Ejecuta: `./dev.sh db:seed`

---

## ¿Qué crea el seed?

| Módulo | Datos |
|--------|-------|
| User | Perfil demo + categorías |
| Accounts | Débito, efectivo, TDC |
| Transactions | Ingreso, gastos, transferencia |
| MSI | Compra iPhone a MSI |
| Recurring | Gasolina quincenal |
| Loan | Préstamo a Juan Pérez |
| CreditCardStatement | Corte pendiente |
| SavingsGoal | Meta vacaciones |
| Investment | CETES, Bitcoin (crypto con ticker para CoinGecko) |
| Budget, Notification | Datos de ejemplo |
