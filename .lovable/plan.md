# Remito de materiales retirado con camión propio

## Cómo funcionaría
Se carga **un solo remito**, en Remitos de materiales, y el sistema registra dos cosas:

1. **El ingreso del material a la obra**: proveedor, obra destino y cada material con su cantidad y precio, igual que ahora.
2. **El viaje de nuestro camión**: se crea solo en Remitos de viajes, vinculado al remito de materiales.

## Qué cambia en la carga
- Nuevo campo **"Transporte"** en el remito de materiales:
  - *Lo trae el proveedor* (como ahora, no se crea ningún viaje).
  - *Camión propio*: aparecen los campos **Camión (interno)**, **Chofer** y **Cantidad de viajes**.
- Al guardar con camión propio se crea el viaje con la misma fecha y N° de remito, origen = proveedor y destino = obra. Se le suma al interno del camión, igual que cualquier viaje.
- Si después editás o borrás el remito de materiales, el viaje se actualiza o se borra junto con él.

## Cómo se ve
- En **Materiales**: una columna "Transporte" que muestra "Propio – interno 7xx" o "Proveedor".
- En **Viajes**: el viaje aparece con una etiqueta "Retiro de material" y el N° de remito, para saber de dónde salió.
- Excel: las dos planillas incluyen estas columnas.
- El material **no se cuenta dos veces**: el viaje registra el traslado del camión, no un ingreso de material.

## Detalles técnicos
- Columnas nuevas en `remitos_materiales`: `transporte` ('proveedor' | 'propio', por defecto 'proveedor'), `camion_id`, `chofer_id`, `cantidad_viajes`.
- Columna nueva `remito_material_id` en la tabla de remitos de viajes, para el vínculo y para borrarlos en cascada.
- La función que guarda el remito de materiales crea, actualiza o borra el viaje vinculado dentro de la misma operación, así no quedan guardados a medias.
- Pruebas: remito con camión propio crea 1 viaje con los mismos datos; al pasar a "proveedor" el viaje se borra.
