# Flujo de desarrollo local - Finward

## Requisitos

- Node.js 20+
- Cuenta Supabase (Cloud o Self-Hosted)
- Tailscale (opcional, para Supabase self-hosted remoto)

## Flujo completo

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

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| SUPABASE_URL | URL pública del proyecto | `https://xxx.supabase.co` |
| SUPABASE_ANON_KEY | JWT público | `eyJ...` |
| SUPABASE_SERVICE_ROLE_KEY | JWT service role | `eyJ...` |
| DATABASE_URL | Pooler (para app runtime) | `postgresql://postgres.[TENANT]:[PASS]@host:6543/postgres?pgbouncer=true` |
| DIRECT_URL | Postgres directo (db push, migrate) | `postgresql://postgres:[PASS]@192.168.100.109:5433/postgres` |
| SEED_USER_ID | UUID usuario en Supabase Auth (para seed) | `00000000-0000-0000-0000-...` |

**Tailscale + Self-Hosted:** Usar `192.168.100.109:5433` en DIRECT_URL para evitar conflicto con pooler en 5432.

### 3. Aplicar schema a la base de datos

```bash
./dev.sh db:push
```

Usa DIRECT_URL internamente. Requiere acceso a Postgres (ej. Tailscale conectado).

### 4. Aplicar políticas RLS

1. Supabase Dashboard > SQL Editor
2. Pegar contenido de `backend/prisma/rls-policies.sql`
3. Run

O si tienes `psql`:
```bash
./dev.sh rls
```

### 5. Seed (datos de prueba)

1. Crear usuario en Supabase Auth: Dashboard > Auth > Users > Add user
2. Copiar UUID del usuario
3. Añadir a `backend/.env`: `SEED_USER_ID=<uuid>`
4. Ejecutar:

```bash
./dev.sh db:seed
```

### 6. Iniciar backend

```bash
./dev.sh start
```

Backend en http://localhost:4000  
API: http://localhost:4000/api  
Swagger: http://localhost:4000/api-docs

### 7. Probar la app

Inicia sesión con el usuario creado en Supabase Auth (el mismo UUID que usaste en SEED_USER_ID). Explora todas las funcionalidades con los datos del seed.

---

## Comandos resumidos

| Comando | Descripción |
|---------|-------------|
| `./dev.sh setup` | Primera vez: .env, npm install, prisma generate |
| `./dev.sh start` | Inicia backend con hot reload |
| `./dev.sh db:push` | Aplica schema a Supabase (usa DIRECT_URL) |
| `./dev.sh db:seed` | Ejecuta seed (requiere SEED_USER_ID) |
| `./dev.sh rls` | Aplica RLS vía psql (o muestra instrucciones) |
| `./dev.sh generate` | Regenera cliente Prisma |
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
