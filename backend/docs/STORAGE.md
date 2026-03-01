# Uploads - Supabase Storage

En lugar de servidor local de archivos (multer, express.static), usar **Supabase Storage**.

## Ventajas

- Sin reinventar la rueda: Storage incluido en Supabase
- CDN, escalable, backups
- URLs públicas o firmadas
- RLS por bucket/carpeta

## Bucket: profile-pictures

Bucket privado para fotos de perfil. Política RLS: solo usuarios autenticados.

### Backend endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/profile/avatar/upload-url | Devuelve `{ path, token }` para subir foto |
| GET | /api/profile/avatar-url | Devuelve signed URL para mostrar foto actual |

### Flujo de subida

1. Cliente llama `POST /api/profile/avatar/upload-url` con `{ contentType?, extension? }`
2. Backend devuelve `{ path, token }` (path: `{userId}/avatar.{ext}`)
3. Cliente sube: `supabase.storage.from('profile-pictures').uploadToSignedUrl(path, token, file)`
4. Cliente actualiza perfil: `PUT /api/profile` con `{ avatar: path }`

### Flujo de visualización

- Cliente llama `GET /api/profile/avatar-url` para obtener URL firmada (1h de validez)
- Si no hay avatar, responde `{ url: null }`

No se requiere multer ni carpeta `/uploads` en el backend.
