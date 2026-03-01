# Setup - Finward Backend

1. Copiar `.env.example` a `.env`
2. Configurar DATABASE_URL, DIRECT_URL (Supabase Postgres)
3. Configurar SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
4. `npm install`
5. `npx prisma db push` - inicial (solo schema). Después usar `prisma migrate dev` para cambios.
6. Ejecutar `prisma/rls-policies.sql` en Supabase SQL Editor
7. `npm run dev`
