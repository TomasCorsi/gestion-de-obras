
# Fix: Carga rapida en modo offline

## Problema

Cuando se corta el WiFi, la app se queda en la pantalla de "Cargando..." durante mucho tiempo (30-90 segundos) porque hay varias peticiones de red que se hacen en secuencia, y cada una espera hasta que el navegador las descarta por timeout:

1. `getSession()` intenta refrescar el token expirado por la red (10-30s de espera)
2. `fetchUserData()` hace 2 peticiones a profiles y user_roles (otros 10-30s)
3. `useEmpleadoProfile` hace otra peticion a personal (otros 10-30s)

## Solucion

Aplicar un patron de "carrera contra el tiempo" (race) con datos cacheados: si las peticiones de red no responden en 3 segundos, usar los datos guardados en localStorage inmediatamente.

### Cambios por archivo:

### 1. `src/hooks/useAuth.tsx`

**Problema**: `initializeAuth` espera a `getSession()` y luego a `fetchUserData()`, ambas bloqueantes offline.

**Solucion**:
- Cargar inmediatamente profile y role desde localStorage al iniciar (antes de cualquier peticion de red)
- Agregar un timeout de 3 segundos a `getSession()`: si no responde, usar la sesion que Supabase ya tiene en localStorage (el SDK la guarda automaticamente)
- Agregar un timeout de 3 segundos a `fetchUserData()`: si no responde, los datos cacheados ya estan seteados, asi que simplemente terminar la carga
- `loading` pasa a `false` rapidamente, desbloqueando `ProtectedRoute`

### 2. `src/hooks/useEmpleadoProfile.ts`

**Problema**: `fetchAndLinkEmpleado` espera la respuesta de la red antes de servir datos.

**Solucion**:
- Cargar los datos cacheados de empleado inmediatamente al iniciar (antes de la peticion de red)
- Agregar un timeout de 3 segundos a la peticion: si no responde, los datos cacheados ya estan disponibles y la carga termina
- Si la red responde antes del timeout, los datos se actualizan con la version fresca

## Detalles Tecnicos

```text
Flujo actual offline (lento):
  getSession() ---- espera 30s timeout ---- falla
  fetchUserData() ---- espera 30s timeout ---- falla, lee cache
  useEmpleadoProfile ---- espera 30s timeout ---- falla, lee cache
  Total: ~90 segundos

Flujo corregido offline (rapido):
  1. Lee cache de profile/role/empleado inmediatamente (0ms)
  2. getSession() con race de 3s → timeout, usa sesion de localStorage
  3. fetchUserData() con race de 3s → timeout, cache ya esta seteado
  4. loading = false → app renderiza
  Total: ~3 segundos maximo
```

La logica de "race" se implementa con `Promise.race([peticion, timeout])` donde el timeout resuelve con un valor de fallback en 3 segundos. Esto no cancela la peticion de red — si la red vuelve, los datos se actualizan en segundo plano.

### Impacto
- Sin cambios visuales ni de UX
- Con conexion: la app funciona identicamente (las peticiones responden en menos de 3s normalmente)
- Sin conexion: la app carga en 3 segundos maximo en vez de 30-90 segundos
