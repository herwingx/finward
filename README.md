# Finward

App de finanzas personales B2C. Clean Architecture, Supabase, Ledger de doble partida.

## Estructura

```
finward/
├── backend/    # API REST con Prisma 7, Supabase Auth, Ledger
└── frontend/   # React + Vite, proxy /api → backend:4000
```

## Inicio rápido (desarrollo local)

```bash
./dev.sh setup       # 1. Primera vez
# Editar backend/.env con Supabase (SUPABASE_*, DATABASE_URL, DIRECT_URL). Si el dominio no resuelve en local: USE_DIRECT_URL=true
./dev.sh db:push     # 2. Aplicar schema
./dev.sh setup-dev   # 3. Usuario demo + seed + RLS
./dev.sh start       # 4. Backend en http://localhost:4000
cd frontend && npm run dev   # 5. Frontend en http://localhost:3000
```

**Credenciales demo:** `demo@finward.dev` / `DemoFinward123!`

Ver [backend/docs/DEVELOPMENT.md](backend/docs/DEVELOPMENT.md) para el flujo completo.

## Despliegue con Docker

Requiere `backend/.env` con Supabase. No usa Postgres local (Supabase externo).

```bash
./deploy.sh start
# Otros: stop | restart | update | logs | status | db:push | shell
```

## Docs

- [backend/docs/DOMAIN.md](backend/docs/DOMAIN.md) - Dominio financiero
- [backend/docs/SETUP.md](backend/docs/SETUP.md) - Instalación
- [backend/docs/DEVELOPMENT.md](backend/docs/DEVELOPMENT.md) - Flujo de desarrollo local
- [backend/docs/RLS.md](backend/docs/RLS.md) - Row Level Security (qué es, para qué sirve)
- [backend/docs/SEED.md](backend/docs/SEED.md) - Seed de datos de prueba
- [backend/docs/ARCHITECTURE.md](backend/docs/ARCHITECTURE.md) - Arquitectura
- [backend/docs/STORAGE.md](backend/docs/STORAGE.md) - Uploads (Supabase Storage)
- [backend/docs/COINGECKO.md](backend/docs/COINGECKO.md) - Precios crypto (CoinGecko)
- [backend/docs/YAHOO_FINANCE.md](backend/docs/YAHOO_FINANCE.md) - Precios acciones/ETFs (Yahoo Finance)

## rls-policies.sql

Políticas de **Row Level Security (RLS)** para Supabase Postgres. RLS filtra filas por usuario a nivel BD. Ejecutar en Supabase SQL Editor **después** de `prisma db push`. Ver [backend/docs/RLS.md](backend/docs/RLS.md) para más detalles.

## Prisma

- **Inicial**: `prisma db push` (usa DIRECT_URL)
- **Tailscale**: DIRECT_URL con `192.168.100.109:5433` (evita conflicto pooler en 5432)
- **Desarrollo local**: Si el dominio (DATABASE_URL) no resuelve, añade `USE_DIRECT_URL=true` en `.env` para usar DIRECT_URL (IP Tailscale) en la app
