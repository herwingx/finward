# Setup - Finward Backend

## Local

1. Copiar `.env.example` a `.env`
2. Configurar Supabase (Cloud o Self-Hosted):

   | Finward | Supabase Cloud | Supabase Self-Hosted |
   |---------|----------------|----------------------|
   | SUPABASE_URL | Project Settings > API > URL | SUPABASE_PUBLIC_URL |
   | SUPABASE_ANON_KEY | Project Settings > API > anon key | ANON_KEY |
   | SUPABASE_SERVICE_ROLE_KEY | Project Settings > API > service_role | SERVICE_ROLE_KEY |
   | DATABASE_URL | Pooler connection string | `postgresql://postgres.[POOLER_TENANT_ID]:[POSTGRES_PASSWORD]@[host]:6543/postgres?pgbouncer=true` |
   | DIRECT_URL | Direct connection string | `postgresql://postgres:[POSTGRES_PASSWORD]@[host]:5432/postgres` |

3. Para Self-Hosted: asegura que Postgres (5432) y Pooler (6543) estén expuestos si Finward corre en otro contenedor/host
4. `npm install`
5. `npx prisma db push` - inicial (solo schema). Después usar `prisma migrate dev` para cambios.
6. Ejecutar `prisma/rls-policies.sql` en Supabase SQL Editor
7. `npm run dev`

## Docker

1. `cp backend/.env.example backend/.env` y configurar Supabase
2. `./deploy.sh start` - backend en puerto 4000
3. `./deploy.sh start --self-hosted` - backend + nginx en puerto 80
4. `./deploy.sh db:push` - aplicar schema a Supabase
