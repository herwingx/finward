# Guía UX/UI - Finward Frontend

Documentación de patrones de diseño, accesibilidad y mejores prácticas aplicadas en la capa visual de Finward (auditoría Marzo 2025).

## Principios

1. **Mobile-First**: El 90% de los usuarios registran gastos desde móvil. La UI está optimizada para uso con una sola mano.
2. **Menos fricción**: Registrar un gasto en ≤3 clics cuando es posible.
3. **Feedback inmediato**: Estados de carga, validación inline y micro-interacciones en cada acción.

---

## Componentes UI

### Button (`components/Button.tsx`)

Componente reutilizable para acciones primarias. **Usar siempre en lugar de `<button>` nativo** para formularios.

- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`, `success`
- **Sizes**: `sm` (36px), `md` (44px min), `lg` (48px min)
- **Props clave**: `isLoading`, `fullWidth`, `leftIcon`, `rightIcon`

```tsx
<Button variant="primary" size="lg" isLoading={isPending} fullWidth>
  Guardar
</Button>
```

**Touch targets**: Botones principales deben usar `size="md"` o `size="lg"` (mínimo 44px) para cumplir WCAG.

### Icon (`components/Icon.tsx`)

Componente unificado que usa **Lucide React** como única librería de iconos. Mapea nombres legacy (Material Symbols) a iconos Lucide para consistencia y aspecto premium.

```tsx
import { Icon } from '@/components/Icon';

<Icon name="add" size={20} />
<Icon name={category.icon} size={24} className="text-app-primary" />
```

### CategorySelector (`components/CategorySelector.tsx`)

- **quickCount**: Muestra las primeras N categorías como botones rápidos (1 clic) encima del grid completo.
- Botones del grid con `min-h-[72px]` para touch.
- Quick categories con `min-h-[44px]`.

### FieldError (`components/FieldError.tsx`)

Mensaje de error inline bajo campos de formulario. Usar junto con validación.

```tsx
<FieldError message={fieldErrors.amount} />
```

---

## Validación

- **Inline**: Errores debajo de cada campo con `FieldError`.
- **Toast**: Errores de API o mensajes globales con `toastError`.
- **Estado**: `fieldErrors: Record<string, string>` en formularios.
- Limpiar errores al cambiar valor: `clearFieldError('fieldName')`.

---

## Touch Targets (WCAG 2.5.5)

| Elemento          | Mínimo   | Implementación                |
|------------------|----------|-------------------------------|
| Botones primarios| 44×44px  | `Button size="md"` o `"lg"`   |
| Selects          | 44px alto| `min-h-[44px] h-12`           |
| Categorías grid  | 72px     | `min-h-[72px]`                |
| Teclado numérico | 52px     | `min-h-[52px]` en cada tecla  |

---

## Animaciones

Definidas en `frontend/src/index.css`:

- **animate-fade-in**: Entrada suave (opacity + translateY)
- **animate-scale-in**: Modal/sheet (scale 0.96→1)
- **animate-shake**: Error de validación (feedback visual)

---

## Sheets y Modales

- **SwipeableBottomSheet**: Bottom sheet en móvil, modal centrado en desktop (≥1024px).
- **DeleteConfirmationSheet**: Confirmación destructiva con niveles (`normal`, `warning`, `critical`).
- Nunca usar `window.confirm()`; usar `DeleteConfirmationSheet`.

---

## Flujos Críticos

### Nueva Transacción

1. FAB → Tipo (Gasto/Ingreso/Transf.)
2. Monto con NumericKeypad
3. Categoría rápida (6 primeras) o grid
4. Concepto, Cuenta, Fecha
5. Confirmar

### Nueva Cuenta

1. Saldo hero
2. Nombre
3. Tipo (grid de 5)
4. Si Crédito: campos específicos
5. Confirmar

---

## Documentación Relacionada

- [docs/PERFORMANCE.md](PERFORMANCE.md) - Optimizaciones de rendimiento
- [backend/docs/ARCHITECTURE.md](../backend/docs/ARCHITECTURE.md) - Arquitectura general
