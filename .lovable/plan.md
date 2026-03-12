

# Plan: Columnas específicas para Remitos en el PDF de Gastos

## Problema
Actualmente las tres categorías (Combustible, Mantenimientos, Remitos) comparten las mismas 4 columnas: Fecha, Descripción, Obra, Costo. El usuario necesita que la sección de Remitos muestre columnas específicas: **Nro Remito, Tipo, Viajes, C. Total, Unidad, Costo**.

## Solución
Generar la sección de Remitos como una **tabla separada** con sus propias columnas, en lugar de compartir la tabla genérica.

### Cambios

**1. `src/components/maquinarias/GastosMaquinaria.tsx`**
- Pasar los remitos filtrados como un array separado al generador PDF, con los campos necesarios: `numero`, `tipo_material`, `cantidad_viajes`, `cantidad` (total), `unidad`, `precio_total`.

**2. `src/utils/generateGastosMaquinariaPDF.ts`**
- Agregar una nueva interface `RemitoDetalle` con los campos: numero, tipo_material, viajes, cantidad_total, unidad, costo.
- Modificar `buildGroupedTableData` para excluir remitos (solo combustible y mantenimientos).
- Después de la tabla agrupada de combustible/mantenimiento, renderizar una **segunda autoTable** exclusiva para remitos con columnas: `[Nro Remito, Tipo Material, Viajes, C. Total, Unidad, Costo]`.
- Incluir subtotal de remitos al final de esa tabla.
- Actualizar la firma de `generateGastosMaquinariaPDF` para recibir el nuevo parámetro `remitosDetalle`.

