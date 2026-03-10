

# Fix: Edición de km/hs en services no persiste

## Causa probable

El `updateMutation` en `useMantenimientos.ts` no usa `.select()` al hacer el update. Esto significa que si la actualización es bloqueada silenciosamente por RLS o un constraint, Supabase devuelve `200 OK` sin error, pero con 0 filas afectadas. El código muestra "actualizado correctamente" aunque nada se guardó.

```typescript
// Actual — no detecta si realmente se actualizó algo
const { error } = await supabase
  .from("mantenimientos")
  .update(mant as any)
  .eq("id", id);
```

## Solución

### 1. `src/hooks/useMantenimientos.ts` — Validar que el update efectivamente modificó filas

Cambiar el `updateMutation` para usar `.select()` y verificar que se devolvió al menos 1 fila. Si no se devuelve ninguna, lanzar error explícito para que el usuario vea el problema.

```typescript
// Corregido — verifica que la fila fue modificada
const { data, error } = await supabase
  .from("mantenimientos")
  .update(mant as any)
  .eq("id", id)
  .select()
  .maybeSingle();

if (error) throw error;
if (!data) throw new Error("No se pudo actualizar el registro. Verificá permisos.");
```

### 2. Mejorar logging de errores

En `onError`, mostrar el mensaje de error específico para facilitar debugging.

Un solo archivo a modificar: `src/hooks/useMantenimientos.ts`, solo la `updateMutation`.

