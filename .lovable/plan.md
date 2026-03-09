

# Agregar columnas Cliente Origen y Cliente Destino con auto-completado

## Problema
Se necesita saber a qué cliente imputar el remito. Las obras se clasifican por su número:
- 100-199: Canteras (no es cliente externo)
- 200-299: Obras internas (no es cliente externo)
- 300+: Obras externas (tiene cliente → auto-completar)

## Solución

### Lógica de clasificación
Crear una función helper `isObraExterna(numero: string): boolean` que parsea el número de obra y devuelve `true` si es >= 300.

### Auto-completado
Cuando el usuario selecciona una obra en "Desde" o "Hasta":
1. Buscar la obra por nombre en el array `obras`
2. Si `isObraExterna(obra.numero)` → colocar `obra.cliente.nombre` en "Cli. Origen" o "Cli. Destino"
3. Si no es externa → dejar el campo vacío

### Cambios en la base de datos
- Agregar columna `cliente_destino` (text, nullable) a la tabla `remitos`
- La columna `cliente` existente se usa como "Cliente Origen"

### Archivos a modificar

**1. Migración DB**: Agregar columna `cliente_destino` a `remitos`

**2. `src/hooks/useRemitos.ts`**: Agregar `cliente_destino` a `RemitoDB`, `RemitoForm` y `RemitoWithRelations`

**3. `src/components/remitos/RemitosSimpleGrid.tsx`**:
- Agregar `cliente_destino` a `LocalRow`, `remitoToLocal`, `createEmptyRow`
- Agregar helper `isObraExterna` y `getClienteForObra`
- Modificar `updateRow`: cuando cambia `desde`, auto-calcular `cliente`; cuando cambia `hasta`, auto-calcular `cliente_destino`
- Reemplazar columna "Cliente" por dos columnas: "Cli. Origen" y "Cli. Destino" (ambas read-only, se rellenan automáticamente)
- Los campos serán de solo lectura (auto-calculados) pero con opción de override manual
- Incluir `cliente_destino` en el save (`formData`)

**4. `src/components/remitos/RemitoQuickFormDialog.tsx`**:
- Reemplazar campo "Cliente" por "Cli. Origen" y "Cli. Destino"
- Agregar auto-completado cuando cambian "Desde" o "Hasta"

**5. `src/pages/Remitos.tsx`**: Agregar `cliente_destino` al filtro de búsqueda

**6. `src/components/remitos/CSVImportDialog.tsx`**: Mapear columna `cliente_destino` en importación CSV

### Detalle técnico de la lógica

```text
function isObraExterna(numero: string | null): boolean {
  if (!numero) return false;
  const num = parseInt(numero, 10);
  return !isNaN(num) && num >= 300;
}

// Cuando cambia "desde":
const obra = obras.find(o => o.nombre === valor);
if (obra && isObraExterna(obra.numero)) {
  row.cliente = obra.cliente?.nombre || "";
} else {
  row.cliente = "";
}

// Cuando cambia "hasta":
const obra = obras.find(o => o.nombre === valor);
if (obra && isObraExterna(obra.numero)) {
  row.cliente_destino = obra.cliente?.nombre || "";
} else {
  row.cliente_destino = "";
}
```

Los campos de cliente seguirán siendo editables manualmente por si el usuario necesita corregir, pero se auto-rellenan al cambiar Desde/Hasta.

