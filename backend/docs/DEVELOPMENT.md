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
| DATABASE_URL | Dominio público (producción/Docker) | `postgresql://postgres:[PASS]@supabase.example.com:5433/postgres` |
| DIRECT_URL | IP Tailscale para migraciones/seed/local | `postgresql://postgres:[PASS]@192.168.100.109:5433/postgres` |
| USE_DIRECT_URL | Si el dominio no resuelve en local: `true` para usar DIRECT_URL en la app | `true` (opcional) |
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

---

## Notas técnicas

### Sincronización Auth ↔ Prisma

Si el id de Supabase Auth difiere del id en `User` (ej. proyecto recreado, migración), `GET /api/profile` detecta el usuario por email y **sincroniza automáticamente**: migra categorías, cuentas, transacciones, etc. al nuevo id. Evita 500 en rutas protegidas.

### Manejo de errores Prisma

Los errores conocidos se convierten en HTTP:

- P2002 (unique constraint) → 409 Conflict
- P2003 (foreign key) → 400 Bad Request
- P2025 (record not found) → 404 Not Found

---

## Solución de problemas

### `Cannot find module '.prisma/client/default'`

El cliente Prisma no está generado. **Solución:**

```bash
# Desde raíz
./dev.sh generate

# O desde backend/
npx prisma generate
```

Este paso se ejecuta automáticamente con `./dev.sh setup` o con `prisma db push`. Si saltaste el setup y ejecutaste solo `npm install` + `npm run dev`, regenera el cliente.

