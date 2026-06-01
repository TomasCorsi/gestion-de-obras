## Problema

Carlos Jerez tiene `rol = repartidor_calecita` en `personal` y `role = maquinista` en `user_roles`. El diálogo de cargas de combustible lee operadores desde la vista `public.personal_selector`, que actualmente está definida con `security_invoker = true`. Eso hace que se aplique la RLS de la tabla `personal` con el rol del usuario que consulta. Como `maquinista` (y tampoco `ayudante`, `remitero`, `repartidor`) no tiene policy `SELECT` sobre `personal`, la vista devuelve 0 filas → no aparecen nombres en el combobox de operador.

La vista solo expone campos no sensibles (`id, nombre, apellido, rol, activo, legajo, user_id`), pensada justamente como selector público para autenticados. El `security_invoker = true` actual rompe ese propósito.

## Solución (1 migración SQL)

Recrear la vista con `security_invoker = false` (security definer, el default) para que cualquier usuario autenticado pueda leer el listado mínimo de empleados, manteniendo la RLS estricta sobre la tabla `personal` (datos sensibles como sueldo, dni, banco, etc. siguen protegidos por la RLS de la tabla base).

```sql
DROP VIEW IF EXISTS public.personal_selector;

CREATE VIEW public.personal_selector
WITH (security_invoker = false) AS
SELECT id, nombre, apellido, rol, activo, legajo, user_id
FROM public.personal;

REVOKE ALL ON public.personal_selector FROM PUBLIC, anon;
GRANT SELECT ON public.personal_selector TO authenticated;
```

Resultado:
- Capataz, admin, maquinista, ayudante, repartidor (todos autenticados) ven el listado mínimo de empleados en selectores → Carlos puede elegir operador. ✅
- La tabla `personal` sigue protegida: solo admin/capataz/dueño del registro pueden leer datos sensibles directamente.

## Verificación

1. Login como Carlos Jerez → Parte Diario → nueva entrega de combustible → el combobox "Operador" muestra la lista de empleados.
2. Login como capataz/admin → sigue funcionando.
3. Login como maquinista común → el selector de ausencias y operadores también funciona.
4. Confirmar que la tabla `personal` no es accesible directamente para maquinistas (datos sensibles siguen ocultos).

## Archivos tocados

- 1 migración SQL (la de arriba). Sin cambios de frontend.
