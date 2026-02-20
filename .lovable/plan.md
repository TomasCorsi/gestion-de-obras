

## Eliminar Scroll Horizontal en Formulario de Nuevo Certificado

### Objetivo
Quitar el scroll horizontal de las tablas dentro del dialog de "Nuevo/Editar Certificado" para que todo el contenido sea visible sin desplazamiento lateral.

### Cambios

**Archivo:** `src/pages/Certificados.tsx`

1. **Reemplazar `overflow-x-auto` por `overflow-x-hidden`** en las tablas del formulario de carga (secciones Obra y Mixto-Obra), que son las que tienen muchas columnas y generan scroll horizontal.

2. **Compactar columnas de la tabla Obra**: Reducir los anchos minimos y usar texto mas corto en los encabezados para que quepan sin scroll:
   - Quitar `min-w-[120px]` del concepto
   - Abreviar encabezados largos (ej: "Cant. Total" a "C.Tot", "% Acum." a "%Ac.", "Av. Ant." a "Av.A")
   - Usar `text-xs` en las celdas para ganar espacio
   - Reducir padding en las celdas con `px-1.5` o `px-2`

3. **Aplicar lo mismo a las tablas del dialog de "Ver Certificado"** para mantener consistencia visual.

### Detalle tecnico

Se modifican los 4 bloques de tablas con `overflow-x-auto`:
- Linea ~1024: Tabla Obra en formulario de carga
- Linea ~1118: Tabla Mixto-Obra en formulario de carga  
- Linea ~1485: Tabla Obra en dialog de ver certificado
- Linea ~1579: Tabla Mixto-Obra en dialog de ver certificado

En cada uno:
- `overflow-x-auto` se cambia a `overflow-hidden`
- Se agregan clases `text-xs` y padding reducido a las celdas
- Se acortan los textos de encabezados para que la tabla quepa en el ancho disponible del dialog (95vw / max-w-7xl)

