# Finward

App de finanzas personales B2C. Clean Architecture, Supabase, Ledger de doble partida.

## Estructura

```
finward/
└── backend/    # API REST con Prisma, Supabase Auth, Ledger
```

## Inicio Rápido (local)

1. `cd backend`
2. `cp .env.example .env` - Configurar Supabase
3. `npm install`
4. `npx prisma db push` - inicial. Después: `prisma migrate dev` para cambios.
5. Ejecutar `prisma/rls-policies.sql` en Supabase SQL Editor
6. `npm run dev`

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

- **Inicial**: `prisma db push` (schema limpio, sin historial de migraciones)
- **Producción**: `prisma migrate dev` / `prisma migrate deploy` (estándar profesional para cambios)
