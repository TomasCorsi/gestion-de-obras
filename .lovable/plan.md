

# Plan: Mejorar PDF de Gastos de Maquinaria

## Problemas actuales
1. Los textos largos en la tabla de detalle se cortan con `substring` pero pueden salirse del recuadro.
2. Los gastos no están agrupados por categoría -- todo está mezclado cronológicamente.

## Cambios en `src/utils/generateGastosMaquinariaPDF.ts`

### 1. Tabla de detalle agrupada por categoría
En lugar de una sola tabla cronológica, generar **secciones separadas** con filas de encabezado:
- **Combustible** (combustible, grasa, aceite, urea)
- **Mantenimientos**
- **Remitos / Viajes**

Cada sección tendrá:
- Una fila de encabezado con fondo de color diferenciado y el nombre de la categoría
- Sus registros ordenados por fecha
- Una fila de subtotal al final de cada grupo

### 2. Prevenir textos fuera de recuadro
- Eliminar los `substring` manuales en la descripción y obra.
- Usar `overflow: 'ellipsize'` o simplemente dejar que `autoTable` maneje el word-wrap con `cellWidth: 'wrap'` en las columnas de descripción/obra.
- Ajustar `columnStyles` para que descripción y obra usen `cellWidth: 'auto'` con `overflow: 'linebreak'`.

### 3. Ajustes de layout
- Usar `didParseCell` hook para aplicar estilos de fila de encabezado de grupo (fondo coloreado, bold).
- Incluir subtotales por categoría en la última columna de cada grupo.

### Detalle técnico

```text
DETALLE DE GASTOS
┌─────────────────────────────────────────────┐
│ COMBUSTIBLE / INSUMOS                       │  ← fila header amber
├──────┬──────────────┬───────────┬────────────┤
│Fecha │ Descripción  │ Obra      │ Costo      │
│...   │ 100L - gasoil│ Obra X    │ $50.000    │
│      │              │           │            │
│      │ Subtotal Combustible     │ $150.000   │
├─────────────────────────────────────────────┤
│ MANTENIMIENTOS                              │  ← fila header purple
├──────┬──────────────┬───────────┬────────────┤
│...   │ Service: ... │ -         │ $80.000    │
│      │ Subtotal Mantenimientos  │ $80.000    │
├─────────────────────────────────────────────┤
│ REMITOS / VIAJES                            │  ← fila header blue
├──────┬──────────────┬───────────┬────────────┤
│...   │ Remito #12...│ Obra Y    │ $200.000   │
│      │ Subtotal Remitos/Viajes  │ $200.000   │
└─────────────────────────────────────────────┘
```

**Archivos a modificar:**
- `src/utils/generateGastosMaquinariaPDF.ts` -- reestructurar la tabla de detalle con agrupamiento y word-wrap
- `src/components/maquinarias/GastosMaquinaria.tsx` -- pasar los gastos separados por categoría al PDF (o agregar campo `tipo` al array de gastos para que el PDF los agrupe)

