# Finward

App de finanzas personales B2C. Clean Architecture, Supabase, Ledger de doble partida.

## Estructura

```
finward/
└── backend/    # API REST con Prisma, Supabase Auth, Ledger
```

## Inicio Rápido (local)

```bash
./dev.sh setup     # Primera vez
./dev.sh start     # Backend en http://localhost:4000
```

O manual: `cd backend` → `cp .env.example .env` → `npm install` → `npx prisma db push` → ejecutar `prisma/rls-policies.sql` en Supabase SQL Editor → `npm run dev`

## Despliegue con Docker

Requiere `backend/.env` con Supabase. No usa Postgres local (Supabase externo).

```bash
# Iniciar backend
./deploy.sh start


# Otros comandos
./deploy.sh stop | restart | update | logs | status | db:push | shell
```

## Docs

- [backend/docs/DOMAIN.md](backend/docs/DOMAIN.md) - Dominio financiero
- [backend/docs/SETUP.md](backend/docs/SETUP.md) - Instalación
- [backend/docs/ARCHITECTURE.md](backend/docs/ARCHITECTURE.md) - Arquitectura
- [backend/docs/STORAGE.md](backend/docs/STORAGE.md) - Uploads (Supabase Storage)

## rls-policies.sql

Archivo SQL con políticas de Row Level Security (RLS) para Supabase Postgres. Ejecutar en Supabase SQL Editor **después** de `prisma db push`, para que cada usuario solo vea sus propios datos.

## Prisma

- **Inicial**: `prisma db push` (usa DIRECT_URL)
- **Self-hosted + Tailscale**: usar `DIRECT_URL` con host `192.168.100.109:5433` para evitar conflicto con pooler en 5432
- **Producción**: `prisma migrate dev` / `prisma migrate deploy` (estándar profesional para cambios)
