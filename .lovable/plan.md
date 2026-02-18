
## Permitir edición del parte del día anterior

### Problema actual
En `src/components/parte-diario/ParteDiarioListView.tsx`, la variable `canEdit` se calcula usando únicamente `isToday(parteDate)`. Si la fecha del parte no es hoy, el sistema redirige al modal de detalle (solo lectura) en lugar de abrir el formulario de edición.

### Solución
Cambiar la condición de `canEdit` para que también permita editar partes del día anterior ("ayer"). El resto del sistema (formulario, guardado, mutations) ya funciona correctamente para editar cualquier parte existente — la única restricción era esta comprobación de fecha en la vista de lista.

### Cambios técnicos

**Archivo: `src/components/parte-diario/ParteDiarioListView.tsx`**

Importar `isYesterday` de `date-fns` junto a `isToday`, y cambiar la condición en dos lugares:

```
// Antes:
const canEdit = isToday(parteDate);

// Después:
const canEdit = isToday(parteDate) || isYesterday(parteDate);
```

Esto afecta:
1. La función `handleCardClick` — para decidir si abrir el formulario o el modal de detalle
2. El cálculo del mismo `canEdit` en el `.map()` — para mostrar el ícono de "Editar" o "Ver detalle"

Además, se actualizará el texto del indicador visual para que diga algo como "Editar (ayer)" en el caso del día anterior, dejando claro al empleado que está editando un parte de ayer.

### Sin cambios en backend
No se requieren cambios en la base de datos ni en las políticas de seguridad. La política RLS ya permite que los empleados modifiquen sus propios partes sin restricción de fecha:

```sql
-- "Employees can manage own partes"
personal_id IN (SELECT personal.id FROM personal WHERE personal.user_id = auth.uid())
```

El hook `useParteDiario` también soporta actualizar cualquier parte por `id` sin restricción de fecha.
