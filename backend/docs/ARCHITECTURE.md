# Arquitectura - Finward Backend

## Capas

- **domain**: Reglas puras (getBillingCycle)
- **useCases**: Lógica de negocio (CreateExpense, CreateTransfer)
- **infrastructure**: Routes, Prisma, Express

## Prisma vs Supabase

- **Prisma 7** con `@prisma/adapter-pg`: conexión via `pg.Pool` (engine type client)
- Prisma: schema, migraciones, queries (backend API)
- **Supabase Auth**: login, register, JWT, req.user (`/api/auth/login`, `/api/auth/register`)
- RLS: aplica si frontend usa Supabase directo
