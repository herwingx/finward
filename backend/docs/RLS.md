# Row Level Security (RLS) en Finward

## ¿Qué es RLS?

**Row Level Security (RLS)** es una función de PostgreSQL que permite filtrar filas por usuario a nivel de base de datos. Cuando RLS está habilitado en una tabla, PostgreSQL aplica automáticamente condiciones (políticas) a cada consulta: solo devuelve o modifica filas que el usuario tiene permitido ver o tocar.

## ¿Para qué sirve?

- **Seguridad**: Evita que un usuario vea o modifique datos de otros usuarios.
- **Defensa en profundidad**: Incluso si hay un bug en el backend, la BD sigue filtrando.
- **Supabase PostgREST**: El API REST de Supabase usa RLS para proteger tablas expuestas públicamente.

## ¿Qué hacemos en Finward?

1. **Habilitamos RLS** en todas las tablas con datos de usuario (`User`, `Account`, `Transaction`, etc.).
2. **Creamos políticas** que usan `auth.uid()` (el UUID del usuario autenticado en Supabase Auth) para restringir acceso:
   - Ejemplo: `auth.uid()::text = "userId"` → solo filas donde `userId` coincide con el usuario logueado.
3. **Tablas derivadas** (LedgerEntry, CreditCardStatement, etc.) filtran vía JOIN con tablas que sí tienen `userId`.

## Flujo

```
Usuario logueado (JWT) → Supabase Auth → auth.uid()
                                            ↓
Consulta SELECT * FROM "Transaction"
                                            ↓
PostgreSQL aplica: WHERE "userId" = auth.uid()
                                            ↓
Solo devuelve transacciones del usuario actual
```

## Archivo rls-policies.sql

- **Ubicación**: `backend/prisma/rls-policies.sql`
- **Cuándo ejecutar**: Después de `prisma db push` o `prisma migrate deploy`
- **Dónde ejecutar**: Supabase SQL Editor (o `psql` con `DIRECT_URL`)

El script hace:
1. `ALTER TABLE "X" ENABLE ROW LEVEL SECURITY` en cada tabla
2. `CREATE POLICY "nombre" ON "X" FOR ALL USING (condición)` con la regla de acceso

## Finward usa Prisma, no PostgREST directo

El backend Finward se conecta con **Prisma** usando `SUPABASE_SERVICE_ROLE_KEY`, que **bypasea RLS**. Por tanto:

- **RLS protege** frente a accesos directos a Postgres (PostgREST, SQL Editor sin privilegios, etc.).
- **Finward** valida `userId` en el código (middleware auth, use cases) y usa `where: { userId }` en Prisma. RLS añade una capa extra si en el futuro usas PostgREST o clientes SQL directos.

## Resumen

| Concepto | Descripción |
|----------|-------------|
| RLS | Filtro de filas por usuario a nivel PostgreSQL |
| `auth.uid()` | UUID del usuario autenticado (Supabase Auth) |
| Política | Regla `USING (auth.uid() = userId)` u otra condición |
| `rls-policies.sql` | Script que habilita RLS y crea las políticas |
| Cuándo aplicar | Después de `prisma db push` / migraciones |
