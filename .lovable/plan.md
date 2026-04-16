

## Plan: Consolidar tablas de certificados — encabezados de columna arriba, etapas como filas de sección

### Problema
Actualmente cada grupo/etapa (ej: "EJECUCIÓN DE OBRA", "GENERAL") genera su propia `<Table>` con su propio `<TableHeader>`. Esto hace que los títulos de sección queden intercalados con los encabezados de columna repetidos, dando un aspecto desordenado.

### Solución
Unificar cada bloque de grupos en **una sola tabla** con un único `<TableHeader>`, e insertar las etapas como **filas de sección** (`<TableRow>` con `colSpan`) dentro del `<TableBody>`.

### Cambios en `src/pages/Certificados.tsx`

**4 bloques afectados** (los mismos 4 de antes):

1. **Modo edición — tabla obra** (~líneas 1087-1165): Sacar la tabla del `.map()` de grupos. Una sola `<Table>` con un `<TableHeader>`, y dentro del `<TableBody>` iterar los grupos insertando primero una fila de sección y luego las filas de datos. El subtotal de cada grupo como fila dentro del body.

2. **Modo edición — tabla mixta obra** (~líneas 1183-1260): Mismo refactor.

3. **Modo vista — tabla obra** (~líneas 1563-1629): Mismo refactor.

4. **Modo vista — tabla mixta obra** (~líneas 1659-1725): Mismo refactor.

### Estructura resultante (ejemplo vista obra)

```text
<div className="overflow-x-auto">
  <Table className="text-xs">
    <TableHeader>
      <TableRow>
        <TableHead>Concepto</TableHead>
        <TableHead>Cat.</TableHead>
        ...13 columnas...
      </TableRow>
    </TableHeader>
    <TableBody>
      {groups.map(group => (
        <>
          {/* Fila de sección */}
          <TableRow>
            <TableCell colSpan={13} className="bg-muted font-semibold text-sm px-3 py-2">
              {group.etapa}
            </TableCell>
          </TableRow>
          {/* Filas de datos */}
          {group.items.map(item => <TableRow>...</TableRow>)}
          {/* Fila subtotal del grupo */}
          <TableRow>
            <TableCell colSpan={12} className="text-right font-medium">
              Subtotal {group.etapa}
            </TableCell>
            <TableCell className="text-right font-semibold">
              {formatCurrency(groupTotal)}
            </TableCell>
          </TableRow>
        </>
      ))}
    </TableBody>
  </Table>
</div>
```

### Detalle técnico
- Se elimina el `<TableFooter>` por grupo (pasa a ser una fila normal en el body)
- El colSpan de la fila de sección se ajusta al número total de columnas (13 en vista, 14 en edición por la columna de borrar)
- Los estilos de la fila de sección mantienen `bg-muted font-semibold` para diferenciarse visualmente

