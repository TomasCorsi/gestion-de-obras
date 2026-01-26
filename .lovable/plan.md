
# Plan: Mejoras en Selector de Operador y Maquinaria en Combustible

## Problema Actual
1. **Operador**: El selector solo muestra maquinistas y choferes, excluyendo otros roles como capataces, ayudantes, etc.
2. **Maquinaria**: El selector muestra todas las maquinarias pero no permite buscar por patente, dificultando la identificación de vehículos.

## Cambios Propuestos

### 1. Mostrar TODO el personal en el selector de Operador
- Eliminar el filtro que restringe a solo maquinistas y choferes
- Incluir todo el personal activo independientemente del rol
- Mantener el formato actual: "Nombre Apellido"

### 2. Agregar patente al selector de Maquinaria
- Modificar el formato de las opciones para incluir la patente cuando exista
- Nuevo formato: "102 - cargadora - ABC123" o "102 - cargadora" si no tiene patente
- Esto permite buscar por código, tipo o patente directamente

## Cambios Técnicos

### Archivo: `src/pages/Gastos.tsx`

| Linea | Cambio |
|-------|--------|
| 155 | Cambiar de `personal.filter(p => (p.rol === "maquinista" \|\| p.rol === "chofer") && p.activo)` a `personal.filter(p => p.activo)` |

### Archivo: `src/components/combustible/CombustibleDataGrid.tsx`

| Sección | Cambio |
|---------|--------|
| maquinariaOptions (77-86) | Agregar patente al label cuando exista |

Nuevo formato de label:
```typescript
label: [
  m.codigo || "",
  m.tipo,
  m.patente || ""
].filter(Boolean).join(" - ")
```

Ejemplos de resultado:
- "102 - cargadora - ABC123" (con patente)
- "103 - camioneta" (sin patente)
- "cargadora" (sin código ni patente, solo tipo)

## Resultado Esperado
- El usuario podrá seleccionar cualquier empleado activo como operador de una carga de combustible
- El usuario podrá buscar maquinarias por código, tipo O patente en el mismo campo de búsqueda
- La identificación de vehículos en campo será más rápida y precisa
