

## Plan: Mejorar persistencia de sesion en PWA movil

### Problema

Cuando un empleado abre la PWA en el celular despues de un tiempo sin usarla (ej: al dia siguiente), la app queda cargando y lo redirige al login. Esto pasa porque:

1. El celular suspende/cierra la PWA cuando no esta en uso
2. Al reabrirla, el token de acceso ya expiro
3. La logica actual intenta `getSession()` pero no hace un refresh proactivo del token expirado
4. El keep-alive solo refresca si el usuario estuvo activo en los ultimos 5 minutos (imposible si la app estaba cerrada)

---

### Solucion

**1. Mejorar la inicializacion de sesion en `useAuth.tsx`**

Despues de llamar a `getSession()`, si no hay sesion valida, intentar `refreshSession()` antes de rendirse. Esto cubre el caso donde el access token expiro pero el refresh token sigue vigente:

```
getSession() -> sin sesion o token expirado?
  -> intentar refreshSession()
  -> si funciona: usuario autenticado sin necesidad de login
  -> si falla: ahora si, redirigir al login
```

**2. Mejorar el comportamiento al reabrir la PWA en `useSessionKeepAlive.ts`**

Cuando la PWA vuelve a estar visible (el usuario la abrio), hacer refresh **sin verificar el timeout de actividad**. El hecho de abrir la app ya demuestra que el usuario esta activo. Solo mantener el throttle de 10 minutos para evitar refrescos excesivos.

**3. Agregar listener `focus` ademas de `visibilitychange`**

En algunos dispositivos moviles, la PWA puede no disparar `visibilitychange` al volver del background. Agregar tambien el evento `focus` como respaldo.

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useAuth.tsx` | Agregar `refreshSession()` como fallback cuando `getSession()` no devuelve sesion valida |
| `src/hooks/useSessionKeepAlive.ts` | Remover chequeo de actividad al reabrir PWA; agregar listener `focus` |

---

### Detalles tecnicos

**useAuth.tsx - initializeAuth mejorado:**

```typescript
const initializeAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!isMounted) return;
    
    if (session?.user) {
      // Sesion valida, usar directamente
      setSession(session);
      setUser(session.user);
      await fetchUserData(session.user.id);
    } else {
      // Sin sesion o token expirado - intentar refresh
      const { data: refreshData } = await supabase.auth.refreshSession();
      if (!isMounted) return;
      
      if (refreshData.session?.user) {
        setSession(refreshData.session);
        setUser(refreshData.session.user);
        await fetchUserData(refreshData.session.user.id);
      } else {
        // Definitivamente no hay sesion
        setSession(null);
        setUser(null);
      }
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
  } finally {
    if (isMounted) setLoading(false);
  }
};
```

**useSessionKeepAlive.ts - refresh al reabrir sin chequeo de actividad:**

```typescript
// Nuevo metodo para PWA wake-up (sin activity check)
const forceRefreshOnWake = async () => {
  if (!isAuthenticated || isRefreshing.current) return;
  if (lastRefreshAt.current && Date.now() - lastRefreshAt.current < VISIBILITY_REFRESH_MIN_INTERVAL) return;
  
  isRefreshing.current = true;
  try {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) lastRefreshAt.current = Date.now();
  } catch (e) {
    console.warn('[Session] Wake refresh error:', e);
  } finally {
    isRefreshing.current = false;
  }
};

// Listeners: visibilitychange + focus
const handleVisibility = () => {
  if (document.visibilityState === 'visible') {
    updateActivity();
    setTimeout(forceRefreshOnWake, 1000);
  }
};
const handleFocus = () => {
  updateActivity();
  setTimeout(forceRefreshOnWake, 500);
};
```

---

### Resultado esperado

- Al abrir la PWA despues de horas sin usarla, la sesion se recupera automaticamente sin pedir login
- Solo se pedira login si el refresh token tambien expiro (tipicamente 1 semana de inactividad total)
- No hay cambios visuales ni flickers al reabrir la app

