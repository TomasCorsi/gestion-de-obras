

# Agregar filas nuevas arriba en la grilla de Remitos

## Cambio

En `src/components/remitos/RemitosSimpleGrid.tsx`, modificar la función `addRow` para insertar la nueva fila al inicio del array en lugar del final:

```typescript
// Antes
setRows((prev) => [...prev, createEmptyRow(numero)]);

// Después
setRows((prev) => [createEmptyRow(numero), ...prev]);
```

Mismo cambio en `duplicateRow`: insertar la copia justo arriba de la fila original en lugar de debajo.

### Archivo a modificar
- `src/components/remitos/RemitosSimpleGrid.tsx`

