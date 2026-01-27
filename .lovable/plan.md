
# Plan: Modo Pantalla Completa para Grilla de Remitos

## Objetivo
Cuando el usuario selecciona el modo "Grilla", la interfaz cambia a un modo pantalla completa que maximiza el espacio disponible para la grilla de datos, ocultando elementos secundarios.

## Diseño Propuesto

### Vista Normal (Tabla)
```text
┌─────────────────────────────────────────────┐
│ Header (Remitos - Gestión de remitos...)    │
├─────────────────────────────────────────────┤
│ FilterBar (fechas, obra)                    │
├─────────────────────────────────────────────┤
│ Búsqueda  │ [Tabla] [Grilla]  │ Importar   │
├─────────────────────────────────────────────┤
│ Stats: Remitos │ Viajes │ Cantidad │ Precio │
├─────────────────────────────────────────────┤
│                                             │
│              TABLA DE DATOS                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Vista Grilla (Pantalla Completa)
```text
┌─────────────────────────────────────────────┐
│ Remitos   [Tabla] [Grilla]   [✕ Salir]      │
├─────────────────────────────────────────────┤
│ [+ Fila] [Descartar]              [Guardar] │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           GRILLA PANTALLA COMPLETA          │
│        (altura calculada dinámicamente)     │
│                                             │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

## Cambios a Implementar

### 1. Modificar `src/pages/Remitos.tsx`

Cuando `viewMode === "grid"`:
- Ocultar el FilterBar
- Ocultar la barra de búsqueda (ya está deshabilitada en modo grilla)
- Ocultar las tarjetas de estadísticas
- Agregar botón para "Salir de pantalla completa" (volver a modo tabla)
- Usar un layout diferente que maximice el espacio

### 2. Modificar `src/components/remitos/RemitosDataGrid.tsx`

- Cambiar `height={500}` a un cálculo dinámico basado en el viewport
- Usar `height={window.innerHeight - headerHeight}` o CSS `calc(100vh - Xpx)`
- Agregar prop `fullScreen` para indicar que debe ocupar todo el espacio

### 3. Estructura del Modo Pantalla Completa

```text
Archivo: src/pages/Remitos.tsx

Cuando viewMode === "grid":
- No usar MainLayout (para evitar padding extra)
- Usar un layout custom con:
  - Header mínimo: título + toggle de modo + botón salir
  - Grilla ocupando el resto de la pantalla
```

## Detalles Técnicos

### Cambios en Remitos.tsx

1. **Renderizado condicional del layout**
   - Si `viewMode === "table"`: usar MainLayout normal con todos los elementos
   - Si `viewMode === "grid"`: usar layout simplificado de pantalla completa

2. **Layout de pantalla completa**
```text
- Container: fixed inset-0, flex flex-col
- Header: altura fija (~60px), con título y controles
- Grid: flex-1, ocupa todo el espacio restante
```

3. **Controles visibles en modo grilla**
   - Toggle para cambiar a modo tabla
   - Botón de importar CSV
   - Los controles de la grilla (Agregar Fila, Guardar, etc.)

### Cambios en RemitosDataGrid.tsx

1. **Nueva prop**
```text
interface RemitosDataGridProps {
  // ... props existentes
  fullScreen?: boolean;
}
```

2. **Altura dinámica**
   - Si `fullScreen`: calcular altura disponible con `calc(100vh - headerHeight)`
   - Usar un ref y ResizeObserver para manejar cambios de tamaño
   - Altura mínima de 400px como fallback

### CSS Adicional

Agregar estilos para el modo pantalla completa:
- Fondo sólido (sin transparencia del grid-pattern)
- Z-index alto para overlay
- Transición suave al entrar/salir

## Flujo de Usuario

1. Usuario entra a Remitos → ve modo Grilla por defecto
2. La grilla ocupa toda la pantalla, máxima visibilidad
3. Puede cambiar a modo Tabla para ver filtros y estadísticas
4. En modo Tabla, tiene todas las opciones (filtros, búsqueda, stats)
5. Puede volver a modo Grilla con un click

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Remitos.tsx` | Layout condicional según viewMode, ocultar elementos en modo grilla |
| `src/components/remitos/RemitosDataGrid.tsx` | Prop fullScreen, altura dinámica |

## Beneficios

- Máxima área de trabajo para entrada de datos
- Sin distracciones visuales
- Ideal para carga masiva de remitos
- Fácil alternar entre modos según la tarea
