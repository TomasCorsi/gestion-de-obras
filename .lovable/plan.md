# Maquinaria del tablero desde partes diarios

## Por qué aparece 0/0

La tarjeta de Maquinaria hoy cuenta la tabla de maquinarias filtrando por la obra asignada en la ficha de la máquina. En la base, de 110 máquinas solo 2 tienen obra asignada, así que casi todas las obras muestran 0/0.

## Cambio propuesto

Calcular la maquinaria de cada obra a partir de los partes diarios del período seleccionado (en septiembre hay 40 partes con máquina cargada, 32 máquinas distintas):

- **Total**: cantidad de máquinas distintas que trabajaron en esa obra durante el período elegido.
- **En uso**: máquinas distintas con parte diario en el día (mes actual) o en el período (meses pasados), es decir el mismo criterio que ya usan "Movimientos hoy" y "Personal hoy".
- Se mantiene el formato `en uso / total` en la tarjeta.
- Las máquinas que sí tengan obra asignada en su ficha se suman al total, para no perder las que están afectadas pero sin parte cargado.

## Qué son los "Movimientos"

Es el total de traslados/operaciones del período para esa obra, sumando:

- Viajes cargados en los partes diarios (`cantidad de viajes`).
- Movimientos internos cargados en los partes diarios.
- Viajes de los remitos de la obra (si el remito no trae cantidad de viajes, cuenta como 1).

En el mes en curso muestra el valor del día; en meses pasados, el total del mes.

## Detalle técnico

- `src/hooks/useTableroObras.ts`: agregar `maquinaria_id` al select de `partes_diarios` y derivar `maquinariasTotal` / `maquinariasEnUso` con Sets de IDs, uniendo las máquinas con `obra_id` asignado.
- Sin cambios de base de datos ni de UI más allá del valor mostrado.
