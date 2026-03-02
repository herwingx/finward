# Flujo de desarrollo local - Finward

## Requisitos

- Node.js 20+
- Supabase Self-hosted (o Cloud) con Auth habilitado
- Prisma 7 con adapter-pg (conexión via `pg.Pool`)

---

## Flujo rápido (primera vez)

```bash
./dev.sh setup       # 1. .env, npm install, prisma generate
# Editar backend/.env con Supabase (SUPABASE_*, DATABASE_URL, DIRECT_URL)
./dev.sh db:push     # 2. Aplicar schema
./dev.sh setup-dev   # 3. Auth user demo + seed + RLS
./dev.sh start       # 4. Iniciar backend
```

**Credenciales demo:** `demo@finward.dev` / `DemoFinward123!`

---

## Paso a paso

### 1. Setup inicial (primera vez)

```bash
# Desde raíz de finward
./dev.sh setup
```

Esto:
- Crea `backend/.env` desde `.env.example` (si no existe)
- Instala dependencias (`npm install`)
- Genera cliente Prisma (`npx prisma generate`)

### 2. Configurar variables de entorno

Edita `backend/.env`:

| Variable | Descripción | Ejemplo (mi setup) |
|----------|-------------|-------------------|
| SUPABASE_URL | SUPABASE_PUBLIC_URL del self-hosted | `https://xxx.supabase.co` |
| SUPABASE_ANON_KEY | ANON_KEY | `eyJ...` |
| SUPABASE_SERVICE_ROLE_KEY | SERVICE_ROLE_KEY | `eyJ...` |
| DATABASE_URL | Pooler (puerto 6543) | `postgresql://postgres.[TENANT]:[PASS]@192.168.100.109:6543/postgres?pgbouncer=true` |
| DIRECT_URL | Postgres directo (5433, evita pooler) | `postgresql://postgres:[PASS]@192.168.100.109:5433/postgres` |
| SEED_USER_ID | Solo para `db:seed` manual; `setup-dev` no lo usa | `00000000-0000-0000-0000-...` |

### 3. Aplicar schema a la base de datos

```bash
./dev.sh db:push
```

Usa DIRECT_URL internamente (Tailscale conectado).

### 4. Setup dev (Auth + Seed + RLS)

```bash
./dev.sh setup-dev
```

Crea usuario **demo@finward.dev** en Supabase Auth, ejecuta seed y aplica RLS. Todo listo para el frontend.

### 5. Iniciar backend

```bash
./dev.sh start
```

Backend: http://localhost:4000  
API: http://localhost:4000/api  
Swagger: http://localhost:4000/api-docs

### 6. Probar frontend

```bash
cd frontend && npm run dev
```

Frontend: http://localhost:3000 (proxy /api → backend:4000)  
Inicia sesión con `demo@finward.dev` / `DemoFinward123!`.

---

## Comandos resumidos

| Comando | Descripción |
|---------|-------------|
| `./dev.sh setup` | Primera vez: .env, npm install, prisma generate |
| `./dev.sh setup-dev` | **Auth user demo + seed + RLS** (demo listo) |
| `./dev.sh start` | Inicia backend con hot reload |
| `./dev.sh db:push` | Aplica schema a Supabase |
| `./dev.sh db:seed` | Solo seed (requiere SEED_USER_ID) |
| `./dev.sh rls` | Aplica RLS vía psql (o instrucciones) |
| `./dev.sh studio` | Abre Prisma Studio |

---

## Flujo día a día

```bash
./dev.sh start   # Iniciar backend
# ... desarrollar ...
# Ctrl+C para detener
```

Para cambios de schema:
```bash
./dev.sh db:push   # Aplicar cambios
./dev.sh rls       # Si añadiste tablas, actualizar rls-policies.sql y ejecutar
```

