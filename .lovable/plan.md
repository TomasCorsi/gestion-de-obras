
# Plan: Activación Directa de Escritura en Celdas con Selector

## Problema Actual
Actualmente, cuando seleccionás una celda con opciones (Desde, Hasta, Unidad, Tipo, Transporte, Patente), necesitás hacer doble clic para poder escribir y buscar. Esto rompe el flujo de trabajo tipo Excel donde podés navegar con Tab y empezar a escribir inmediatamente.

## Solución
Modificar el componente `GridSelectCell` para que acepte la propiedad `focus` que provee `react-datasheet-grid` y automáticamente enfoque el input cuando la celda esté en modo edición.

## Cambios Técnicos

### 1. Actualizar `GridSelectCell` para aceptar el prop `focus`

**Archivo:** `src/components/shared/GridSelectCell.tsx`

- Agregar `focus?: boolean` a la interfaz de props
- Usar un `useEffect` que detecte cuando `focus` cambia a `true` y automáticamente:
  - Enfoque el input interno
  - Seleccione todo el texto para que puedas escribir directamente
  - Abra el menú de opciones

### 2. Actualizar las definiciones de columnas en `RemitosDataGrid`

**Archivo:** `src/components/remitos/RemitosDataGrid.tsx`

- Modificar todas las columnas que usan `GridSelectCell` (desde, hasta, unidad, tipo_material, tipo_transporte, maquinaria_id) para pasar el prop `focus` desde las props del componente de celda

### 3. Actualizar las definiciones de columnas en `CombustibleDataGrid`

**Archivo:** `src/components/combustible/CombustibleDataGrid.tsx`

- Aplicar el mismo cambio a las columnas que usan `GridSelectCell` (obra_id, maquinaria_id, operador)

## Flujo de Usuario Mejorado

```text
Antes:
[Click en celda] → [Doble click] → [Escribir para buscar]

Después:  
[Click en celda o Tab] → [Escribir directamente]
```

## Beneficios
- Navegación fluida tipo Excel con Tab entre celdas
- Escritura inmediata sin necesidad de doble clic
- Experiencia consistente en todas las columnas con selector
- Mejora significativa en velocidad de carga de datos masivos
