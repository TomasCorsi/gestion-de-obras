
# Fix: PWA Partes Diarios no funciona sin internet

## Problema

Cuando no hay conexion a internet, la app no puede cargar la pagina de Parte Diario porque varios hooks dependen de llamadas a la base de datos que fallan silenciosamente:

1. **`useAuth` (fetchUserData)**: Carga `profiles` y `user_roles` desde la base de datos. Si falla, `role` queda en `null` y `ProtectedRoute` muestra un spinner infinito (linea 30-36).
2. **`useEmpleadoProfile`**: Carga el registro de `personal` desde la base de datos. Si falla, `empleado` queda en `null` y la pagina muestra "Perfil no encontrado".
3. **`useParteDiario`**: Las queries de partes fallan, pero esto es menos critico porque el formulario puede funcionar con la cola offline.

La sesion de Supabase Auth si se recupera desde localStorage (el SDK la persiste), pero los datos de perfil/rol/empleado no estan cacheados.

## Solucion

Cachear los datos criticos de usuario (profile, role, empleado) en localStorage y servirlos como fallback cuando las peticiones de red fallan. Esto permite que la app se renderice correctamente offline.

### Cambios por archivo:

### 1. `src/hooks/useAuth.tsx`
- En `fetchUserData`: tras obtener profile y role exitosamente, guardarlos en localStorage con claves `offline_cache_profile_{userId}` y `offline_cache_role_{userId}`
- Si las peticiones fallan (catch), intentar cargar desde localStorage como fallback
- Esto desbloquea `ProtectedRoute` porque `role` ya no sera `null` offline

### 2. `src/hooks/useEmpleadoProfile.ts`
- Tras obtener el empleado exitosamente, guardarlo en localStorage con clave `offline_cache_empleado_{userId}`
- Si la peticion falla, cargar desde localStorage como fallback
- Esto evita el mensaje "Perfil no encontrado" cuando no hay red

### 3. `src/hooks/useParteDiario.ts`
- Configurar las queries con `retry: false` y `networkMode: 'offlineFirst'` para que no bloqueen la UI esperando red
- El sistema de offline queue ya maneja el guardado de partes sin conexion

### 4. `src/pages/ParteDiario.tsx`
- La query de `personal_selector` tambien necesita un fallback offline similar al que ya tienen obras y maquinarias (usar `saveToOfflineCache`/`loadFromOfflineCache`)

## Detalles Tecnicos

```text
Flujo offline actual (roto):
  App abre -> getSession() OK (localStorage) -> fetchUserData() FALLA
  -> role = null -> ProtectedRoute muestra spinner infinito

Flujo offline corregido:
  App abre -> getSession() OK (localStorage) -> fetchUserData() FALLA
  -> fallback: cargar profile/role desde cache -> role = "maquinista"
  -> ProtectedRoute pasa -> useEmpleadoProfile FALLA
  -> fallback: cargar empleado desde cache -> empleado disponible
  -> Parte Diario renderiza OK -> usuario puede crear partes offline
```

### Reutilizacion del cache existente
Se reutilizaran las funciones `saveToOfflineCache` y `loadFromOfflineCache` de `src/hooks/useOfflineCache.ts` que ya existen en el proyecto, manteniendo consistencia con el patron actual.

### Impacto
- Sin cambios visuales ni de UX
- La app se comporta identicamente cuando hay conexion
- Offline: la app carga con datos cacheados y permite crear partes que se sincronizan al volver online
