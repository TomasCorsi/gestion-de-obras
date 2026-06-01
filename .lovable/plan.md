## Problema

En el Parte Diario, el rol **capataz** no ve la lista de empleados en la sección "Ausencias". El frontend consulta la vista `public.personal_selector`, pero esa vista **no tiene `GRANT SELECT` para el rol `authenticated`** (solo el rol interno de sandbox). Resultado: la query devuelve 0 filas para cualquier usuario autenticado (capataz, maquinista, etc. que la usaban en el selector).

Esto es secuela de la migración de seguridad reciente, donde se recreó la vista con `security_invoker = true` y se revocó `anon`, pero no se restauró el grant a `authenticated`.

## Solución (1 migración SQL, mínima)

```sql
GRANT SELECT ON public.personal_selector TO authenticated;
```

Con `security_invoker = true`, la RLS de `personal` se aplica al usuario que consulta:
- **admin / capataz** → policy "Admins and capataces can view all personal" ⇒ ven todos los empleados activos. ✅
- **maquinista / ayudante** → no tienen policy de SELECT sobre `personal`, así que seguirán sin ver datos por la vista (comportamiento intencional).

## Verificación

1. Login como capataz → ir a Parte Diario → sección Ausencias muestra la lista completa de empleados activos.
2. Login como admin → sigue funcionando igual.
3. Login como maquinista → su parte diario sigue funcionando (no usa el listado de ausencias).

## Archivos tocados

- 1 migración SQL (solo el `GRANT` de arriba). Sin cambios de código frontend.
