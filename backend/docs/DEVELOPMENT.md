# Guía de Desarrollo - Finward Backend

## Estructura de Carpetas

```
src/
├── shared/        # errors, types, security (compartido)
├── lib/           # supabase, prisma clients
├── modules/
│   └── <module>/
│       ├── domain/      # reglas puras
│       ├── useCases/    # lógica de negocio
│       └── infrastructure/  # routes, controllers
├── jobs/          # cron jobs
├── server.ts
└── swagger.ts
```

## Convenciones

- Use Cases: `CreateExpenseUseCase.ts`, `createExpense(input)`
- Routes: `transactionRoutes.ts`, `authMiddleware` en rutas protegidas
- Errores: usar `AppError.badRequest()`, `AppError.notFound()`, etc.

## Conventional Commits

- `feat:` - Nueva funcionalidad
- `fix:` - Bug fix
- `docs:` - Documentación
- `chore:` - Config, deps
- `refactor:` - Refactor

Ejemplo: `feat: add recurring transactions module`

## Comandos

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm run start` - Ejecutar build
- `npx prisma migrate dev` - Crear migración (con DB local)
- `npx prisma migrate deploy` - Aplicar migraciones (producción)
- `npx prisma studio` - UI de base de datos
