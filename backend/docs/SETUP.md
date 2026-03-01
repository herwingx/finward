# Setup - Finward Backend

## Flujo recomendado (con demo listo)

```bash
./dev.sh setup       # .env, npm install, prisma generate
# Editar backend/.env
./dev.sh db:push     # Schema
./dev.sh setup-dev   # Usuario demo + seed + RLS
./dev.sh start       # Backend
```

**Usuario demo:** `demo@finward.dev` / `DemoFinward123!`

## Variables de entorno (Self-hosted + Tailscale)

| Finward | Origen |
|---------|--------|
| SUPABASE_URL | SUPABASE_PUBLIC_URL |
| SUPABASE_ANON_KEY | ANON_KEY |
| SUPABASE_SERVICE_ROLE_KEY | SERVICE_ROLE_KEY |
| DATABASE_URL | Pooler `postgresql://postgres.[TENANT]:[PASS]@192.168.100.109:6543/postgres?pgbouncer=true` |
| DIRECT_URL | Direct `postgresql://postgres:[PASS]@192.168.100.109:5433/postgres` (5433 evita pooler) |

## Comandos

- `./dev.sh setup` - Setup inicial
- `./dev.sh setup-dev` - **Crea auth user, seed y RLS** (demo listo)
- `./dev.sh db:push` - Aplicar schema
- `./dev.sh start` - Iniciar backend
