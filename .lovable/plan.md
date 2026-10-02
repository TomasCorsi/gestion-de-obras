# Ítems del remito en su propio renglón (pantalla y Excel)

Hoy los ítems adicionales (día de retro, medio día de motoniveladora, etc.) aparecen como "+2 ítems" en la grilla y en el Excel van resumidos en una columna y en una hoja aparte. El cambio: cada ítem pasa a tener **su propio renglón, justo debajo del remito principal**, como si fuera otro remito pero agrupado con él.

## Cómo se va a ver en el sistema

```text
02/10/2026 | 1234 | Desde: Cantera X | Hasta: Obra Y | Cliente Z | Tierra | 9 viajes | 216 M3 | $ ...   [editar][borrar]
02/10/2026 | 1234 | Desde: Cantera X | Hasta: Obra Y | Cliente Z |  └ Día de retro        | 1 DIA   | $ ...
02/10/2026 | 1234 | Desde: Cantera X | Hasta: Obra Y | Cliente Z |  └ Día de motoniveladora| 0,5 DIA | $ ...
```

- Los renglones de ítems repiten **fecha, N° de remito (local y tercero), desde, hasta, clientes, forma de pago y cargado por**, para saber siempre de qué remito y cliente son.
- En la columna Tipo muestran el concepto con una marca "└" y un fondo apenas distinto, para que se note que pertenecen al remito de arriba.
- Cantidad, unidad, precio unitario y total son los del ítem. Viajes, vehículo y patente quedan vacíos (no se imputan a máquinas ni cuentan viajes, igual que hoy).
- El remito principal muestra solo el importe del viaje; el total de la grilla sigue sumando viaje + ítems.
- Se quita la columna "Ítems" (+N ítems), ya no hace falta.
- **Editar**: el lápiz del renglón de un ítem abre el remito principal, donde se editan cabecera e ítems juntos (como ya funciona). El botón borrar solo aparece en el remito principal (borrar el remito borra sus ítems).

## Cómo se va a ver en el Excel

- La hoja "Remitos" usa el mismo formato: un renglón por remito y debajo un renglón por cada ítem, repitiendo fecha, N° de remito, desde, hasta y clientes.
- Se agrega una columna **"Tipo renglón"** (Remito / Ítem) para poder filtrar fácil.
- "Precio Total" del renglón principal queda solo con el viaje (así sumando la columna da el total real sin duplicar).
- Se eliminan las columnas resumen "Ítems adicionales" / "Importe ítems" y la hoja aparte "Ítems".

## Detalles técnicos

- `RemitosSimpleGrid.tsx`: aplanar `remitos` + `itemsMap` a una lista de filas `{kind: 'remito'|'item', remito, item?}` para el virtualizador; render de fila ítem con campos heredados del remito; `onEdit(remito)` en ambos tipos; quitar columna `items`.
- `Remitos.tsx` `exportarExcel`: construir filas intercaladas en la hoja "Remitos" con columna "Tipo renglón"; precio total del remito sin ítems; eliminar hoja "Ítems".
- Sin cambios en base de datos, formulario de edición, liquidaciones ni cálculos de internos/viajes.
