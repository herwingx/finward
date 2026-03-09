# Finward Frontend

> Frontend de **Finward** — React 19, Vite 7, diseño premium estilo Vercel/Resend.

## Requisitos

- Node 20+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

- **Frontend:** http://localhost:3000
- **Proxy:** `/api` → backend en http://localhost:4000

## Build y Preview

```bash
npm run build
npm run preview
```

## Variables de entorno

Copia `.env.example` a `.env`:

```env
VITE_API_URL=/api
```

En desarrollo, el proxy de Vite redirige `/api` a `localhost:4000`. En producción, nginx sirve `/api` al backend.

---

## Arquitectura

### Estructura de carpetas (Feature-Sliced Design)

```
src/
├── app/                    # Providers, configuración global
│   └── providers.tsx       # QueryClient, Toaster, tema
├── components/             # Componentes compartidos
│   ├── forms/              # Formularios (AccountForm, TransactionForm, etc.)
│   ├── ui/                 # UI base (Calendar, Popover)
│   └── dashboard/          # Widgets del dashboard
├── context/                # Contextos React
│   └── GlobalSheetContext.tsx
├── hooks/                  # Hooks reutilizables
│   ├── useApi.ts           # Mutaciones y queries (TanStack Query)
│   ├── useAuth.ts
│   ├── useDashboardStats.ts
│   ├── useFinancialPlanning.ts
│   ├── useIsMobile.ts
│   ├── useSafeToSpend.ts
│   └── useTheme.ts
├── layouts/                # Layouts de página
│   ├── MainApp.tsx         # Shell principal (sidebar, bottom nav)
│   ├── ProtectedRoute.tsx
│   └── GuestRoute.tsx
├── lib/                    # Utilidades y cliente API
│   ├── api/                # Cliente fetch, endpoints
│   ├── queryClient.ts
│   └── utils.ts
├── pages/                  # Vistas por ruta
│   ├── Auth/               # Login, Register, Reset Password
│   ├── Accounts/           # CRUD de cuentas
│   ├── Installments/       # Compras MSI
│   └── ...
├── types/                  # Tipos TypeScript
├── utils/                  # Helpers (toast, fechas, iconos)
│   ├── toast.tsx           # Wrappers Sileo
│   ├── dateUtils.ts
│   └── icons.ts
├── App.tsx                 # Rutas principales
├── main.tsx
└── index.css               # Tailwind + tema
```

### Capas principales

| Capa | Propósito |
|------|-----------|
| `lib/api` | Cliente HTTP con JWT, manejo 401, `apiFetch` y `apiFetchNoJson` |
| `hooks/useApi` | TanStack Query: queries, mutaciones y hooks por entidad |
| `context/GlobalSheetContext` | Hoja global para formularios (transacciones, cuentas, etc.) |
| `utils/toast` | Notificaciones vía [Sileo](https://sileo.aaryan.design/docs) |

---

## Stack

| Tecnología | Uso |
|------------|-----|
| **React 19** | UI |
| **Vite 7** | Build y dev server |
| **TanStack Query** | Cache y sincronización con API |
| **Tailwind CSS v4** | Estilos |
| **lucide-react** | Iconos |
| **Sileo** | Toasts |
| **Recharts** | Gráficas |
| **Radix UI** | Popover, accesibilidad |
| **Framer Motion** | Animaciones |
| **Vite PWA** | PWA y auto-update |
| **tailwindcss-safe-area** | Padding seguro para dispositivos con notch |

---

## UX/UI

Ver [../docs/UX-UI.md](../docs/UX-UI.md) para patrones de diseño, componentes (Button, NumericKeypad, CategorySelector), validación inline, touch targets y flujos críticos.

## Mobile-first

El frontend sigue **arquitectura mobile-first**:

- **Tailwind:** estilos base para móvil, `md:`, `lg:` para pantallas más grandes.
- **Breakpoint único:** 1024px (`lg`) para distinguir móvil vs desktop — `useIsMobile` y `SwipeableBottomSheet` usan este valor.
- **Layout móvil:** BottomNav + MobileFAB (< 1024px).
- **Layout desktop:** DesktopSidebar + DesktopFAB (≥ 1024px).
- **Safe areas:** `pt-safe`, `pb-safe`, `pb-safe-offset-*` (tailwindcss-safe-area) para dispositivos con notch.
- **Touch targets:** Botones ≥ 44px; `touch-action: manipulation` para evitar retraso táctil.
- **Viewport:** `viewport-fit=cover` en `index.html` para soportar áreas seguras.

---

## API y Autenticación

- El token JWT se guarda en `localStorage` y se envía en `Authorization: Bearer <token>`.
- En 401, se borra el token y se redirige a `/login`.
- Endpoints centralizados en `lib/api/index.ts` y consumidos vía `useApi.ts`.

---

## Notificaciones (Sileo)

Las notificaciones usan [Sileo](https://sileo.aaryan.design/docs):

- `sileo.success`, `sileo.error`, `sileo.warning`, `sileo.info` para mensajes simples
- `sileo.action` para toasts con botón de acción
- `sileo.promise` para flujos loading → success/error

Los helpers `toastSuccess`, `toastError`, `toastInfo`, `toast` en `@/utils/toast` encapsulan Sileo para uso consistente en toda la app.

---

## Integración con el monorepo

- **dev.sh** (raíz): `./dev.sh setup` y `./dev.sh start` configuran e inician backend; luego `cd finward/frontend && npm run dev` para el frontend.

---

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard |
| `/history` | Historial de transacciones |
| `/accounts` | Cuentas |
| `/categories` | Categorías |
| `/goals` | Metas de ahorro |
| `/investments` | Inversiones |
| `/installments` | Compras MSI |
| `/loans` | Préstamos |
| `/recurring` | Transacciones recurrentes |
| `/reports` | Reportes |
| `/financial-analysis` | Análisis financiero |
| `/settings` | Configuración |
| `/profile` | Perfil de usuario |
| `/trash` | Papelera |
| `/login`, `/register` | Auth público |
