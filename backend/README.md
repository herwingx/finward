# Finward Backend

API REST con Clean Architecture, Supabase, Ledger de doble partida. Uploads via Supabase Storage.

## Inicio Rápido

1. `cp .env.example .env` - Configurar Supabase
2. `npm install`
3. `npx prisma generate` - genera el cliente Prisma (obligatorio antes de `dev`)
4. `npx prisma db push` - aplica schema a la BD
5. `npm run dev`

> **Nota:** Si al ejecutar `npm run dev` ves `Cannot find module '.prisma/client/default'`, ejecuta `npx prisma generate` y vuelve a intentar.

## Docs

- [docs/DOMAIN.md](docs/DOMAIN.md) - Dominio financiero
- [docs/SETUP.md](docs/SETUP.md) - Instalación
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitectura
- [docs/API.md](docs/API.md) - API Swagger

## Comandos

- `npm run dev` - Desarrollo (requiere `prisma generate` ejecutado antes)
- `npm run build` - Build
- `npm run db:generate` - Genera cliente Prisma
- `npx prisma migrate deploy` - Migraciones
- `npx prisma studio` - DB UI
