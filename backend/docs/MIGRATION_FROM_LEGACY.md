# Migración desde proyecto anterior

Rebranding y refactor: Finward es una reescritura completa del backend anterior.

| Anterior | Finward |
|----------|---------|
| Backend monolítico | backend/ con Clean Architecture |
| Auth manual (JWT, bcrypt) | Supabase Auth |
| Balance en cuenta | Ledger + balance cache |
| Uploads locales (multer) | Supabase Storage |
| cloudflared en compose | Cloudflare vía apt (opcional) |

Todo el código relevante está en finward/backend. No hay rutas ni controladores que migrar desde el proyecto anterior.
