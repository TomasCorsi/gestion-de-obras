
## Mejorar funcionamiento sin conexión a internet (Offline)

### Diagnóstico

La PWA ya cachea los archivos estáticos (JS, CSS, HTML, imágenes) gracias a `vite-plugin-pwa`. Sin embargo, cuando no hay internet, la app falla porque:

1. **Las respuestas de Supabase no se cachean**: Obras, maquinarias, partes anteriores, etc., necesitan conexión. Si el dispositivo no tiene internet, las queries devuelven error y las listas se muestran vacías o en error.
2. **El formulario de Parte Diario pierde las obras y máquinas disponibles**: El empleado no puede completar el formulario si no cargó esos datos previamente.
3. **No hay indicador de estado de conexión**: Los empleados no saben si están offline y no entienden por qué no se guardan sus datos.

### Estrategia de solución

Se implementará una solución en **dos capas**:

**Capa 1 — Caché de datos de referencia (obras y máquinas)**  
Los datos que raramente cambian (lista de obras activas, lista de máquinas) se guardarán en `localStorage` cada vez que se carguen correctamente. Cuando no hay internet, se usarán los datos cacheados en lugar de mostrar un error.

**Capa 2 — Cola de partes offline (guardar y sincronizar)**  
Cuando un empleado guarda un parte sin internet, en lugar de mostrar error, se guarda localmente en `localStorage` con un estado `pending_sync`. Cuando la conexión se recupera, la app detecta los partes pendientes y los sube automáticamente al servidor.

**Capa 3 — Indicador visual de conexión**  
Un banner sutil que aparece cuando el dispositivo está offline para que el empleado sepa que sus datos se guardarán localmente y se sincronizarán cuando vuelva la conexión.

---

### Cambios técnicos detallados

#### 1. `src/hooks/useOfflineCache.ts` (nuevo)
Hook utilitario que:
- Persiste en `localStorage` una lista de datos de referencia (obras, máquinas, personal)
- Los expone con fallback: si la query falla por falta de red, usa los datos del caché
- Indica si los datos son "frescos" o provienen del caché

#### 2. `src/hooks/useOfflineQueue.ts` (nuevo)
Hook para la cola de sincronización:
- `enqueueOfflineParte(data)`: guarda un parte en la cola local con un ID temporal
- `syncPendingPartes()`: cuando hay conexión, toma los partes pendientes y los sube
- `pendingCount`: número de partes en espera de sincronización

#### 3. `src/hooks/useNetworkStatus.ts` (nuevo)
Hook simple que escucha `online`/`offline` del navegador:
```typescript
const { isOnline, wasOffline } = useNetworkStatus();
```
Al recuperar conexión (`wasOffline → true`), dispara la sincronización automática.

#### 4. `src/components/pwa/OfflineBanner.tsx` (nuevo)
Banner pequeño que aparece en la parte inferior cuando `isOnline === false`:
- Muestra: "Sin conexión — Los partes se guardarán localmente"
- Si hay partes pendientes al volver online: "Sincronizando X partes..."
- Desaparece automáticamente cuando se sincroniza

#### 5. `src/hooks/useParteDiario.ts` (modificar)
En las mutaciones `saveDraft` y `completeParte`:
- Si hay conexión: comportamiento actual (guarda en Supabase)
- Si no hay conexión: llama a `enqueueOfflineParte(data)` y muestra toast informativo

#### 6. `src/components/parte-diario/ParteDiarioFormView.tsx` (modificar)
En los handlers `handleSaveDraft` y `handleComplete`:
- Detectar error de red vs error de validación
- Si es error de red: mensaje específico "Guardado localmente, se sincronizará cuando haya conexión"

#### 7. `vite.config.ts` (modificar)
Agregar caché de las respuestas de API de Supabase en el Service Worker usando estrategia `NetworkFirst`:
- Para `/rest/v1/obras`, `/rest/v1/maquinarias`, `/rest/v1/personal`: cachear con `NetworkFirst` y TTL de 24 horas
- Esto permite que el SW sirva datos de API cacheados si la red falla

#### 8. `src/App.tsx` (modificar)
Agregar el `OfflineBanner` en el layout principal.

---

### Flujo de uso offline

```text
Empleado abre la app sin internet
         ↓
SW sirve los assets estáticos (JS, CSS) — OK
         ↓
useAuth recupera sesión de localStorage — OK (ya implementado)
         ↓
Queries de obras/maquinarias fallan
         ↓
useOfflineCache detecta error + retorna datos de localStorage
         ↓
Empleado ve el formulario con datos del día anterior
         ↓
Empleado completa y guarda el parte
         ↓
Sin conexión → useOfflineQueue.enqueueOfflineParte()
         ↓
Banner: "Guardado localmente"
         ↓
Recupera conexión (online event)
         ↓
useOfflineQueue.syncPendingPartes() → sube a Supabase
         ↓
Banner: "Sincronización completada ✓"
```

### Limitaciones

- Los datos de referencia que se muestran offline serán los últimos cargados mientras había conexión. Si hay obras o máquinas nuevas agregadas mientras el empleado estuvo sin internet, no aparecerán hasta reconectar.
- La autenticación ya está resuelta (el token se persiste en `localStorage` y se renueva al recuperar conexión, como está implementado en `useSessionKeepAlive`).
