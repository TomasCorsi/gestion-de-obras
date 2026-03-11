

# Fix: Mecánicos no pueden modificar estado de mantenimientos

## Problema identificado

Hay **dos problemas relacionados** con la misma causa raíz:

1. Los mecánicos crean mantenimientos en estado "Pendiente" y cuando intentan cambiar el estado, **el cambio no se guarda** en la base de datos
2. La app muestra "En Proceso" (estado local del formulario) pero la vista admin muestra "Pendiente" (valor real en la DB que nunca se actualizó)

## Causa raíz

La función `is_personal_mecanico()` en la base de datos solo verifica `rol = 'mecanico'`:

```sql
-- Actual
WHERE user_id = _user_id AND rol = 'mecanico'
```

Pero varios mecánicos tienen `personal.rol = 'ayudante'` y `user_roles.role = 'maquinista'` (default). Para estos usuarios:

- `is_personal_mecanico()` retorna **false** (no son 'mecanico')  
- `has_role(uid, 'ayudante')` retorna **false** (su user_role es 'maquinista')
- Solo pasan la policy de SELECT para maquinistas, pero **no pueden INSERT/UPDATE/DELETE**

El frontend ya trata a los ayudantes como mecánicos (`useEmpleadoProfile` tiene `isMecanico`), pero la DB no.

## Solución

### Migración SQL (único cambio necesario)

Modificar la función `is_personal_mecanico` para incluir ayudantes:

```sql
CREATE OR REPLACE FUNCTION public.is_personal_mecanico(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.personal
    WHERE user_id = _user_id
      AND rol IN ('mecanico', 'ayudante')
  )
$$;
```

Esto corrige automáticamente **todas** las policies RLS que usan `is_personal_mecanico()`:
- SELECT, INSERT, UPDATE, DELETE en `mantenimientos`
- SELECT, UPDATE en `observaciones_maquina_estado`

No requiere cambios de código frontend ni nuevas policies.

