
## Plan: Pintar filas en la grilla de Remitos (como Excel)

### Funcionalidad
Agregar la posibilidad de hacer clic derecho (o usar un boton) sobre una fila en la grilla de Remitos para asignarle un color de fondo. El color se guarda en la base de datos y es visible para todos los usuarios.

### Colores disponibles
Una paleta de 6 colores predefinidos + opcion de quitar color:
- Amarillo (resaltado)
- Verde (confirmado/OK)
- Azul (en proceso)
- Naranja (atencion)
- Rojo (urgente/problema)
- Violeta (especial)
- Sin color (quitar)

### Interaccion
- Menu contextual (clic derecho) sobre cualquier fila de la grilla
- Aparece un popover con los colores como circulos clickeables
- Al seleccionar un color, se guarda inmediatamente en la base de datos (sin necesidad de usar el boton Guardar)
- La fila se pinta con el color elegido como fondo suave (transparencia ~15%)

### Cambios tecnicos

#### 1. Migracion de base de datos
Agregar columna `row_color` de tipo `text` (nullable) a la tabla `remitos`:
```sql
ALTER TABLE public.remitos ADD COLUMN row_color text DEFAULT NULL;
```

#### 2. `src/hooks/useRemitos.ts`
- Agregar `row_color` a las interfaces `RemitoDB` y `RemitoForm`
- Agregar una funcion `updateRowColor(id, color)` que hace un UPDATE directo (sin pasar por el batch save)

#### 3. `src/components/remitos/RemitosDataGrid.tsx`
- Agregar `row_color` al tipo `GridRow` y al `initialData`
- Crear un componente de menu contextual con los colores (usando Popover de Radix)
- Usar la prop `rowClassName` existente para aplicar clases CSS dinamicas segun `row_color`
- Recibir `onColorChange` como prop para guardar el color al instante

#### 4. `src/index.css`
- Agregar clases CSS para cada color de fila (ej: `.row-color-yellow`, `.row-color-green`, etc.) con fondos semitransparentes que funcionen en modo oscuro y claro

#### 5. `src/pages/Remitos.tsx`
- Pasar la funcion `updateRowColor` al componente `RemitosDataGrid`

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Agregar columna `row_color` |
| `src/hooks/useRemitos.ts` | Agregar campo y funcion de color |
| `src/components/remitos/RemitosDataGrid.tsx` | Menu contextual + clases de color |
| `src/index.css` | Estilos de colores de fila |
| `src/pages/Remitos.tsx` | Pasar prop de color |
