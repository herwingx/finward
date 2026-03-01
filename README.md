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
# Editar backend/.env con Supabase (DATABASE_URL, DIRECT_URL, SUPABASE_*)
./dev.sh db:push   # Aplicar schema
# Ejecutar prisma/rls-policies.sql en Supabase SQL Editor
./dev.sh db:seed   # (opcional) Datos de prueba - requiere SEED_USER_ID
./dev.sh start     # Backend en http://localhost:4000
```

Ver [backend/docs/DEVELOPMENT.md](backend/docs/DEVELOPMENT.md) para el flujo completo de desarrollo local.

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
- [backend/docs/DEVELOPMENT.md](backend/docs/DEVELOPMENT.md) - Flujo de desarrollo local
- [backend/docs/RLS.md](backend/docs/RLS.md) - Row Level Security (qué es, para qué sirve)
- [backend/docs/SEED.md](backend/docs/SEED.md) - Seed de datos de prueba
- [backend/docs/ARCHITECTURE.md](backend/docs/ARCHITECTURE.md) - Arquitectura
- [backend/docs/STORAGE.md](backend/docs/STORAGE.md) - Uploads (Supabase Storage)

## rls-policies.sql

Políticas de **Row Level Security (RLS)** para Supabase Postgres. RLS filtra filas por usuario a nivel BD. Ejecutar en Supabase SQL Editor **después** de `prisma db push`. Ver [backend/docs/RLS.md](backend/docs/RLS.md) para más detalles.

## Prisma

- **Inicial**: `prisma db push` (usa DIRECT_URL)
- **Self-hosted + Tailscale**: usar `DIRECT_URL` con host `192.168.100.109:5433` para evitar conflicto con pooler en 5432
- **Producción**: `prisma migrate dev` / `prisma migrate deploy` (estándar profesional para cambios)
