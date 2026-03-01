# Arquitectura - Finward Backend

## Capas

- **domain**: Reglas puras (getBillingCycle)
- **useCases**: Lógica de negocio (CreateExpense, CreateTransfer)
- **infrastructure**: Routes, Prisma, Express

## Prisma vs Supabase

- Prisma: schema, migraciones, queries (backend API)
- Supabase Auth: JWT, req.user
- RLS: aplica si frontend usa Supabase directo
