## Objetivo

Que los empleados no tengan que tocar "Actualizar ahora" ni reinstalar la app. Cuando haya una nueva versión, se aplica sola sin interrumpir lo que están haciendo.

## Comportamiento esperado

- La app sigue revisando si hay versión nueva (cada 5 min y cuando vuelven a abrirla).
- Cuando detecta una versión nueva:
  - Si el empleado **no tiene un parte diario a medio cargar**, se actualiza sola en segundo plano y recarga la app la próxima vez que cambia de pantalla.
  - Si **sí tiene un borrador de parte diario sin guardar**, espera y muestra el banner rojo actual ("Actualizar ahora") para que el usuario decida cuándo recargar — así no se pierde nada.
- Desaparece el banner rojo en el caso normal: la actualización es silenciosa.

## Cambios técnicos

1. **`src/components/pwa/UpdatePrompt.tsx`**
   - Cuando `needRefresh` se vuelve `true`:
     - Si `hasAnyParteDiarioDraft()` es `false`, llamar `updateServiceWorker()` automáticamente (sin mostrar banner).
     - Si hay borrador, seguir mostrando el banner rojo como hoy.
   - Disparar la auto-actualización también en el próximo cambio de ruta / `visibilitychange` para no interrumpir un click en curso.

2. **`src/hooks/useServiceWorker.ts`**
   - Además del intervalo de 5 min, llamar `registration.update()` cuando la pestaña pasa a visible (`visibilitychange`) para detectar versiones nuevas al volver a abrir la PWA.

3. **Sin cambios** en `vite.config.ts` ni en el manifest (cambiar esos campos es lo que obliga a reinstalar en iOS).

## Aclaración importante

Esta mejora **previene futuras reinstalaciones**, pero la reinstalación que ya ocurrió no se puede deshacer retroactivamente para los empleados. A partir de que tengan esta versión instalada, las siguientes actualizaciones serán automáticas y silenciosas.
