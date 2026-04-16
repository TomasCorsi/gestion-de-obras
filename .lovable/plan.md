

## Plan: Corregir alineación de encabezados en tabla de certificados

### Problema
Los encabezados de las tablas de detalle de certificados se ven separados del contenido porque el componente `TableHead` tiene una altura fija de `h-12` (48px) que no se sobreescribe con los `py-2` personalizados. Además, el wrapper `overflow-hidden` externo genera conflicto visual.

### Solución
En `src/pages/Certificados.tsx`, agregar `h-auto` a todos los `TableHead` de las tablas de certificados tipo "obra" y "mixto" (tanto en modo edición como en modo vista), y cambiar el wrapper `overflow-hidden` por `overflow-x-auto` para evitar conflictos de scroll.

### Cambios en `src/pages/Certificados.tsx`

Hay 4 tablas afectadas (2 en modo edición, 2 en modo vista):

1. **Modo edición - tabla obra** (~línea 1095-1113): Cambiar `overflow-hidden` → `overflow-x-auto` y agregar `h-auto` a cada `TableHead`
2. **Modo edición - tabla mixta** (~línea 1189-1207): Mismo cambio
3. **Modo vista - tabla obra** (~línea 1570-1587): Mismo cambio
4. **Modo vista - tabla mixta** (~línea 1666-1680): Mismo cambio

Ejemplo de cambio por encabezado:
```
// Antes
<TableHead className="px-1.5 py-2">Concepto</TableHead>

// Después
<TableHead className="px-1.5 py-2 h-auto">Concepto</TableHead>
```

Y el wrapper:
```
// Antes
<div className="overflow-hidden">

// Después
<div className="overflow-x-auto">
```

