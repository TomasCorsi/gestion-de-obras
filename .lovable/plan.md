

## Plan: Selector de mecánicos y ayudantes en "Atendida por"

### Problema
Actualmente el campo "Atendida por" es un input de texto libre. Se necesita reemplazarlo por un selector (Combobox) que muestre solo los empleados con rol **mecánico** o **ayudante**.

### Cambios

#### 1. Modificar `ObservacionesCampoTab.tsx`
- Importar el componente `Combobox` ya existente en el proyecto
- Agregar una query para traer el personal filtrado por rol `mecanico` y `ayudante` desde la tabla `personal`
- Reemplazar el `<Input>` del campo "Atendida por" por un `<Combobox>` con las opciones de mecánicos/ayudantes
- Guardar el nombre completo del empleado seleccionado (no el ID) en `atendida_por`, ya que la columna en la base de datos es de tipo texto
- El Combobox permitirá buscar por nombre o apellido

#### 2. Detalle técnico

| Archivo | Cambio |
|---------|--------|
| `src/components/mantenimiento/ObservacionesCampoTab.tsx` | Reemplazar input de texto por Combobox con personal filtrado por rol mecanico/ayudante |

**Query para obtener mecánicos y ayudantes:**
```text
supabase
  .from("personal")
  .select("id, nombre, apellido, rol")
  .in("rol", ["mecanico", "ayudante"])
  .eq("activo", true)
  .order("apellido")
```

**Opciones del Combobox:**
Cada opción mostrará "Apellido Nombre (Rol)" para fácil identificación, y el valor guardado será el nombre completo "Nombre Apellido".

### Resultado
- El campo "Atendida por" muestra un selector con autocompletado
- Solo aparecen mecánicos y ayudantes activos
- Se puede buscar por nombre o apellido
- No requiere cambios en la base de datos (la columna `atendida_por` sigue siendo texto)

