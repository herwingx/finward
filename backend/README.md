# Finward Backend

API REST con Clean Architecture, Supabase, Ledger de doble partida. Uploads via Supabase Storage.

## Inicio Rápido

1. `cp .env.example .env` - Configurar Supabase
2. `npm install`
3. `npx prisma db push` - inicial
4. `npm run dev`

## Docs

- [docs/DOMAIN.md](docs/DOMAIN.md) - Dominio financiero
- [docs/SETUP.md](docs/SETUP.md) - Instalación
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitectura
- [docs/API.md](docs/API.md) - API Swagger

## Comandos

- `npm run dev` - Desarrollo
- `npm run build` - Build
- `npx prisma migrate deploy` - Migraciones
- `npx prisma studio` - DB UI
