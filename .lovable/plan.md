

## Plan: Proteger datos sensibles de la tabla `personal`

### Problema
1. **Tabla `personal`**: La politica "Authenticated users can view personal for selectors" permite que CUALQUIER usuario autenticado lea TODAS las columnas, incluyendo DNI, sueldos, datos bancarios, etc.
2. **Vista `personal_legajo_lookup`**: No tiene RLS, aunque solo expone campos minimos (id, legajo, rol, ya_vinculado). Se usa durante el registro de empleados.

### Solucion

#### 1. Crear una vista segura `personal_selector` (migracion SQL)
Una vista con SECURITY DEFINER que expone solo campos no sensibles para uso en selectores/comboboxes:
- `id`, `nombre`, `apellido`, `rol`, `activo`, `legajo`, `user_id`

Esto excluye: `dni`, `email`, `telefono`, `sueldo`, `sueldo_negro`, `banco`, `numero_cuenta`, `situacion_laboral`, `licencia`, `vencimiento_licencia`, `modalidad_pago`

#### 2. Eliminar la politica permisiva en `personal`
Eliminar la politica `"Authenticated users can view personal for selectors"` que permite lectura completa a todos los autenticados.

#### 3. Actualizar componentes para usar la vista segura
Cambiar las queries de los componentes que solo necesitan datos de selector para que consulten `personal_selector` en lugar de `personal`:

| Componente / Hook | Campos que usa | Cambio |
|---|---|---|
| `ObservacionesCampoTab.tsx` | id, nombre, apellido, rol | Usar `personal_selector` |
| `useEmpleadosSinParte.ts` | id, nombre, apellido, legajo, rol, user_id | Usar `personal_selector` |
| `useParteDiarioResumenGeneral.ts` | id, nombre, apellido, rol, legajo | Usar `personal_selector` |
| `useParteDiarioRendimiento.ts` | id, nombre, apellido, rol, legajo | Usar `personal_selector` |
| `useDashboardData.ts` | id (count) | Usar `personal_selector` |

**No se cambian** (solo accesibles para admin/capataz por las politicas existentes):
- `usePersonal.ts` (select `*` - usado en pagina de gestion de Personal, solo admin)
- `UserManagement.tsx` (solo admin)
- `useEmpleadoProfile.ts` (filtra por `user_id = auth.uid()`, accede al propio registro)

#### 4. Proteger `personal_legajo_lookup`
Agregar RLS a la vista con una politica que permita SELECT a usuarios anonimos (necesario para el flujo de registro) pero limitada a los campos ya expuestos.

### Detalle tecnico - Migracion SQL

```text
-- 1. Crear vista segura para selectores (sin datos sensibles)
CREATE OR REPLACE VIEW public.personal_selector
WITH (security_invoker = false)
AS
SELECT id, nombre, apellido, rol, activo, legajo, user_id
FROM public.personal;

-- 2. Dar acceso a la vista
GRANT SELECT ON public.personal_selector TO authenticated;

-- 3. Eliminar la politica permisiva
DROP POLICY IF EXISTS "Authenticated users can view personal for selectors" ON public.personal;
```

### Resultado
- Usuarios con rol maquinista/ayudante/etc solo podran ver nombre, apellido, rol y legajo via la vista segura
- Los datos sensibles (DNI, sueldos, bancos) solo seran accesibles para admin, capataz, y el propio empleado
- Los selectores/comboboxes seguiran funcionando normalmente
- No se rompe ninguna funcionalidad existente

