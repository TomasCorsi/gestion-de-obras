
## Diagnóstico

Los km **sí se están sincronizando correctamente** en la base de datos. Verifiqué el camión 954 del screenshot: tiene `km_acumulados = 226.873` en la tabla `maquinarias`, igual al máximo de `km_camion` cargado en partes diarios. El trigger `sync_horas_km_from_parte` está funcionando.

**El problema real:** el diálogo de detalle (y el formulario de edición) en `src/pages/Maquinarias.tsx` solo muestra "Kilómetros Actual" para tipos `auto` y `camioneta`. Para el resto (`camion`, `carreton`, `cisterna`, `tanque_cisterna`, `tanque_regador_tractor`, `camion batea`, etc.) muestra "Horómetro Actual" en horas — y esos vehículos tienen `horas_acumuladas = 0` porque andan por km.

Por eso ves "0 h" en el camión 954, aunque la BD tiene 226.873 km guardados.

## Solución: mostrar km para todos los vehículos sobre ruedas

### Cambio único en `src/pages/Maquinarias.tsx`

1. **Definir un helper** `esVehiculoKm(tipo)` que devuelva `true` para tipos que se miden por kilómetros:
   - `auto`, `camioneta`, `camion`, `carreton`, `cisterna`, `tanque_cisterna`, `tanque_regador_tractor`, `batea`, `acoplado`

2. **Reemplazar los dos lugares** donde se compara `tipo === "auto" || tipo === "camioneta"`:
   - Label del formulario de edición (línea 552)
   - Label y valor del DetailRow en el diálogo de detalle (líneas 607-611)

   Usar `esVehiculoKm(tipo)` para mostrar `km_acumulados` formateado como `"XXX.XXX km"`, y horómetro en horas para el resto (maquinaria pesada: cargadora, retro, motoniveladora, etc.).

### Resultado
El detalle del camión 954 mostrará "Kilómetros Actual: 226.873 km" en vez de "Horómetro Actual: 0 h". Lo mismo para los demás camiones, carretones y cisternas. No hay cambios en BD ni en triggers porque los datos ya están bien.

### Nota adicional
Hay 4 partes diarios con `maquinaria_id = NULL` y `km_camion` cargado (ej: 2185 km del 16/04). Esos no se sincronizan a ninguna maquinaria porque no se eligió el camión al cargar el parte. No es un bug del trigger, es un parte mal cargado por el chofer. Si querés, en otro plan podemos forzar que el chofer seleccione su camión obligatoriamente al cargar km.
