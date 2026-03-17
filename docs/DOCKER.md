# Finward - Docker

## Requisitos

- Docker y Docker Compose
- `backend/.env` con variables del backend (ver abajo)
- `.env` en la raíz (o variables exportadas) con `VITE_*` para build del frontend

## Levantar

```bash
docker compose up -d
```

App: http://localhost  
API: http://localhost/api  
Health: http://localhost/api/health (pasando por proxy)

## Arquitectura

| Servicio | Puerto interno | Descripción |
|----------|----------------|-------------|
| backend  | 4000           | API Express (Prisma, Supabase) |
| frontend | 80             | React (Vite build) servido por Nginx |
| proxy    | 80 (host)      | Nginx: /api → backend, / → frontend |

## Variables de entorno

### 1. `backend/.env` (obligatorio)

El backend recibe todas sus variables desde `backend/.env` via `env_file`.

Variables críticas:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`, `DIRECT_URL`
- `USE_DIRECT_URL` — en Docker suele ser `false` (dominio público). Si la DB está en Tailscale, el contenedor no la alcanzará salvo que uses `network_mode: host`.
- `ALLOWED_ORIGINS` — añadir `http://localhost` si accedes por puerto 80
- `FRONTEND_URL` — opcional, para recuperación de contraseña

### 2. `.env` en la raíz (para build del frontend)

Docker Compose usa estas variables como build-args. Copia `.env.docker.example` a `.env`:

```
VITE_API_URL=/api
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`, el login fallará (supabaseUrl required).

### 3. Resumen por servicio

| Variable           | Dónde              | Usado por |
|--------------------|--------------------|-----------|
| DATABASE_URL       | backend/.env       | Backend (Prisma) |
| DIRECT_URL         | backend/.env       | Backend (migraciones) |
| USE_DIRECT_URL     | backend/.env       | Backend |
| SUPABASE_*         | backend/.env       | Backend |
| VITE_API_URL       | .env raíz          | Frontend (build) |
| VITE_SUPABASE_*    | .env raíz          | Frontend (build) |

## Base de datos desde Docker

- Si Postgres está **externo** (Supabase Cloud, self-hosted vía dominio): `USE_DIRECT_URL=false`, usa `DATABASE_URL` con dominio.
- Si Postgres está en **Tailscale** (IP privada): el contenedor normalmente no tiene Tailscale. Opciones:
  1. Usar dominio público de Supabase si existe.
  2. `network_mode: host` en el servicio backend (solo Linux) para usar la red del host.
  3. Montar un servicio Postgres en el mismo compose para desarrollo local.

## Rebuild tras cambios en .env

```bash
docker compose build --no-cache frontend
docker compose up -d
```

El frontend embebe las `VITE_*` en el build; cambios en `.env` requieren rebuild.
