# Pendientes - Finward

Documento para tareas futuras. Prioridad orientativa.

---

## Alta prioridad

### Health check con DB
- Añadir al endpoint `/health` una verificación de conexión a Postgres (query simple).
- Devolver 503 si la DB no responde, 200 si todo OK.
- Útil para Docker healthchecks y monitoreo.

### Tests
- Unit tests para lógica crítica:
  - Cálculos MSI (`PayInstallmentUseCase`, `CreateInstallmentPurchaseUseCase`)
  - `computeFinancialBalances`
  - `expandMsiInPeriod`, `expandRecurringInPeriod`
- Integration tests para flujos clave:
  - Crear gasto → ledger + balance
  - Login → profile → cuentas

---

## Prioridad media

### API versionado
- Rutas bajo `/api/v1/` para permitir cambios sin romper clientes.
- Documentar en API.md.

### Swagger completo
- Schemas request/response para todos los endpoints.
- Actualmente: solo Error, TransactionCreate, AccountCreate y algunas rutas documentadas.

### Variables de entorno
- Revisar que `.env.example` (backend y frontend) y `.env.docker.example` incluyan todas las variables necesarias.
- Documentar valores por entorno (dev, docker, prod).

---

## Baja prioridad

### Logging / observabilidad
- Enviar logs estructurados a servicio externo (Logtail, Datadog, etc.).
- Métricas básicas (requests/s, latencia, errores 5xx).

### Rate limiting por ruta
- Límites más estrictos en auth (login, register).
- Límites más relajados en lectura (GET).

---

## Referencias

- [API.md](../backend/docs/API.md)
- [CALCULATIONS.md](../backend/docs/CALCULATIONS.md)
- [DOCKER.md](./DOCKER.md)
- [TELEGRAM-GEMINI.md](./TELEGRAM-GEMINI.md) — Plan del bot de Telegram + Gemini
