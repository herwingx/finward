# Setup - Finward Backend

## Local

1. Copiar `.env.example` a `.env`
2. Configurar Supabase (Cloud o Self-Hosted):

   | Finward | Supabase Cloud | Supabase Self-Hosted |
   |---------|----------------|----------------------|
   | SUPABASE_URL | Project Settings > API > URL | SUPABASE_PUBLIC_URL |
   | SUPABASE_ANON_KEY | Project Settings > API > anon key | ANON_KEY |
   | SUPABASE_SERVICE_ROLE_KEY | Project Settings > API > service_role | SERVICE_ROLE_KEY |
   | DATABASE_URL | Pooler connection string | `postgresql://postgres.[TENANT]:[PASS]@[host]:6543/postgres?pgbouncer=true` |
   | DIRECT_URL | Direct Postgres (db push/migrate) | `postgresql://postgres:[PASS]@[host]:5433/postgres` |

3. Para Self-Hosted: Postgres (5433 o 5432), Pooler (6543). Usar **5433** en DIRECT_URL si 5432 está ocupado por Supavisor.
4. `npm install`
5. `npx prisma db push` - inicial (solo schema). Usa DIRECT_URL.
6. Ejecutar `prisma/rls-policies.sql` en Supabase SQL Editor
7. `npm run dev`

### Seed (datos de prueba)

Para poblar datos de prueba y probar todas las funcionalidades:

1. Crea un usuario en Supabase Auth (Dashboard > Auth > Users)
2. Añade `SEED_USER_ID=<uuid>` a `backend/.env`
3. `npm run db:seed` (o `./dev.sh db:seed` desde raíz)

Ver [docs/SEED.md](SEED.md) para más detalles.

## Desarrollo con Tailscale

Acceso directo al Supabase self-hosted vía Tailscale:

- Host: `192.168.100.109` (o la IP de tu nodo Tailscale)
- DIRECT_URL: `postgresql://postgres:[POSTGRES_PASSWORD]@192.168.100.109:5433/postgres`
- DATABASE_URL: `postgresql://postgres.[TENANT]:[PASS]@192.168.100.109:6543/postgres?pgbouncer=true`

Usar **puerto 5433** para Postgres direct en DIRECT_URL evita conflictos con el pooler/Supavisor en 5432.

## Docker

1. `cp backend/.env.example backend/.env` y configurar Supabase
2. `./deploy.sh start` - backend en puerto 4000
3. `./deploy.sh start --self-hosted` - backend + nginx en puerto 80
4. `./deploy.sh db:push` - aplicar schema a Supabase (usa DIRECT_URL del .env)
