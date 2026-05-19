## Objetivo

Darle acceso a `/remitos` a **Sergio** sin tocar el flujo de auth ni los permisos de ningún otro usuario (remiteros, maquinistas, capataces, etc.).

## Enfoque: excepción puntual por UUID

Replicamos exactamente el patrón que ya existe en la RLS de Postgres (`"Sergio can manage own remitos"` con su UUID hardcodeado). Lo trasladamos al frontend en `ProtectedRoute` para que pueda entrar a la pantalla.

**Nada cambia para:**
- Otros remiteros (siguen entrando por su rol)
- Otros capataces / maquinistas (siguen sin acceso a `/remitos`)
- `useAuth`, hooks, App Launcher, navbar (sin cambios)
- Permisos RLS (ya están correctos: la policy de Sergio existe)

## Cambios

### 1. `src/components/auth/ProtectedRoute.tsx`
Agregar una lista chica de **excepciones por UUID** para rutas específicas. Si el `user.id` del usuario está en la excepción de la ruta actual, se le permite el acceso aunque su rol no esté en `requiredRoles`.

```tsx
// UUIDs con acceso especial a rutas puntuales (mismo patrón que las RLS de Sergio/Franco)
const ROUTE_EXCEPTIONS: Record<string, string[]> = {
  '/remitos': ['c92028bd-dd42-416d-8892-f00b5ef90f8f'], // Sergio
};

// dentro del componente, antes del check de rol:
const exceptions = ROUTE_EXCEPTIONS[location.pathname] ?? [];
if (user && exceptions.includes(user.id)) {
  return <>{children}</>;
}
```

### 2. App Launcher (opcional)
Si Sergio no ve el tile de "Remitos" en el launcher por filtro de rol, agregar la misma excepción ahí. Hay que revisar `src/components/layout/AppLauncher.tsx` para confirmar. Si no filtra por rol, no se toca nada.

### 3. Base de datos
**Sin migración.** El rol actual de Sergio (`maquinista`) se respeta, la RLS ya lo deja gestionar sus propios remitos. No agregamos filas a `user_roles`.

## Detalles técnicos

- El cambio es ~6 líneas en un solo archivo (`ProtectedRoute.tsx`), más quizá 2-3 líneas en `AppLauncher.tsx`.
- Cero impacto en otros usuarios: la lógica de roles existente no se modifica, solo se agrega un short-circuit previo basado en UUID.
- Trazable y reversible: borrar el UUID de `ROUTE_EXCEPTIONS` revoca el acceso al instante.
- Consistente con el patrón ya usado en RLS (`Sergio can manage own remitos`, `Franco can manage own remitos`).

## Verificación

- Sergio entra a `/remitos` ✅ y sigue pudiendo entrar a `/parte-diario` ✅ (su rol `maquinista` ya lo habilita).
- Otros maquinistas siguen siendo redirigidos a `/sin-acceso` al ir a `/remitos`.
- Remiteros existentes y Franco siguen funcionando idéntico.

## Si en el futuro hay más casos
Cuando aparezca el 3er o 4to usuario "multi-rol", conviene migrar a un sistema real de múltiples roles en `useAuth`. Por ahora, con 2 excepciones (Sergio + Franco ya hardcodeado en RLS), el patrón de UUID es el menos invasivo.
