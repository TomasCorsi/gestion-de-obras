
## Bug: las cards de maquinarias muestran "0 horas" para camiones

En `src/pages/Maquinarias.tsx` (líneas 406-408), las **cards de la grilla principal** todavía usan la condición vieja `maq.tipo === "auto" || maq.tipo === "camioneta"`. Por eso los camiones (944, 945, 946 del screenshot) muestran "0 horas" en vez de los km que tienen guardados en BD.

El fix anterior se aplicó al diálogo de detalle y al formulario de edición, pero esta sección de cards quedó sin cambiar.

## Solución

### Cambio único en `src/pages/Maquinarias.tsx`

Reemplazar la condición de las líneas 406-408 para que use el helper `esVehiculoKm(tipo)` (ya definido en este mismo archivo en el fix anterior), de modo que muestre km para todos los vehículos sobre ruedas: `auto`, `camioneta`, `camion`, `carreton`, `cisterna`, `tanque_cisterna`, `tanque_regador_tractor`, `batea`, `acoplado`.

```tsx
{esVehiculoKm(maq.tipo)
  ? `${(maq.km_acumulados ?? 0).toLocaleString()} km`
  : `${maq.horas_acumuladas.toLocaleString()} horas`}
```

### Sobre la actualización automática
La sincronización con el último dato del parte diario **ya funciona**: el trigger `sync_horas_km_from_parte` actualiza `maquinarias.km_acumulados` con el `MAX(km_camion)` cada vez que se completa un parte. No se requiere cambio en BD.

### Resultado
Los cards de los camiones 944, 945, 946 mostrarán sus km reales (los del último parte diario) en vez de "0 horas".
