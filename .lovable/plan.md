

## Fix: Operador no aparece en entregas del Repartidor

### Causa
Al proteger los datos sensibles de la tabla `personal`, se elimino la politica que permitia a todos los usuarios autenticados ver la lista completa. Ahora el repartidor solo puede ver su propio registro, por lo que el selector de operador queda vacio.

### Solucion
Cambiar la pagina `ParteDiario.tsx` para que obtenga la lista de personal desde la vista segura `personal_selector` (que solo expone nombre, apellido, rol, legajo) en lugar de la tabla completa `personal`.

### Cambios

| Archivo | Cambio |
|---|---|
| `src/pages/ParteDiario.tsx` | Reemplazar `usePersonal()` por una query directa a `personal_selector` que devuelve solo los campos necesarios para los selectores |

### Detalle tecnico
- Se reemplaza la llamada a `usePersonal()` (que hace `select("*")` en la tabla `personal`) por un `useQuery` que consulta la vista `personal_selector`
- La vista `personal_selector` ya esta accesible para todos los usuarios autenticados y solo expone: `id`, `nombre`, `apellido`, `rol`, `activo`, `legajo`, `user_id`
- El componente `CargaCombustibleRepartidorDialog` solo necesita `id`, `nombre`, `apellido` y `legajo`, asi que la vista es suficiente
- No se requieren cambios en la base de datos

