# Uploads - Supabase Storage

En lugar de servidor local de archivos (multer, express.static), usar **Supabase Storage**.

## Ventajas

- Sin reinventar la rueda: Storage incluido en Supabase
- CDN, escalable, backups
- URLs públicas o firmadas
- RLS por bucket/carpeta

## Uso

1. Crear bucket en Supabase Dashboard (Storage)
2. Políticas RLS: `auth.uid() = user_id` en `storage.objects`
3. Frontend: `supabase.storage.from('avatars').upload(path, file)`
4. Backend: opcional proxy para signed URLs si se necesita lógica extra

No se requiere multer ni carpeta `/uploads` en el backend.
