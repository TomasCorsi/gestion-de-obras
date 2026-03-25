

## Plan: Corregir layout del PDF - conductor, ancho de tabla y colores

### Problemas identificados
1. **Conductor pisa texto**: La fila del conductor usa `drawField` que concatena label+value en texto libre, y si el nombre es largo se superpone con "KM período" en `col2X`
2. **Tabla actividad no ocupa todo el ancho**: Tiene `tableWidth: 110` hardcodeado (línea 324)
3. **Colores poco profesionales**: Los pasteles actuales (naranja claro, lila, celeste) son inconsistentes

### Cambios en `src/utils/generateGastosMaquinariaPDF.ts`

**1. Fix conductor - separar en su propia fila completa**
- Mover conductor(es) a una fila dedicada que ocupe todo el ancho (sin compartir con KM/Hs)
- Poner KM período y Hs período en otra fila separada
- Aumentar `equipoBoxHeight` para acomodar las 2 filas extra
- Truncar nombres largos si es necesario

**2. Tabla actividad - ancho completo**
- Eliminar `tableWidth: 110` (línea 324) para que use todo el ancho disponible entre márgenes
- Ajustar `columnStyles` para que "Concepto" ocupe más espacio y "Cantidad" se alinee bien

**3. Colores más profesionales**
- Header de tablas: gris oscuro corporativo `[45, 45, 45]` en vez de azul
- Categorías del resumen: tonos de gris neutro en vez de pasteles coloridos
- Tabla actividad header: mismo gris oscuro corporativo para consistencia
- Fila total actividad: gris medio sutil
- Mantener el rojo `[180, 0, 0]` solo para GASTO TOTAL (brand color)

