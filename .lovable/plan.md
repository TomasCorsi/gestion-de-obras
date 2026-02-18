
## Solución: sesión robusta al reabrir la PWA

### Diagnóstico confirmado

Los logs del backend muestran el error exacto: `refresh_token_not_found`. Esto ocurre cuando:

1. El celular mata la PWA en segundo plano (iOS/Android lo hacen para ahorrar batería)
2. El `useSessionKeepAlive` deja de renovar el token porque la app no está activa
3. Al reabrir, el refresh token guardado localmente ya fue invalidado en el servidor (se rota por uso o expira)
4. El sistema intenta usarlo → falla → cierra la sesión → pantalla de carga larga → login

El largo tiempo de carga viene de que `initializeAuth` hace 2 requests encadenados antes de decidir que no hay sesión válida (primero `getSession()`, después `refreshSession()`), y si ambos fallan, el listener de `SIGNED_OUT` intenta un tercer `getSession()`.

### Qué se va a cambiar

#### 1. `src/hooks/useAuth.tsx` — Inicialización más rápida y limpia

**Problema actual**: Si no hay sesión o el refresh falla, el código hace hasta 3 llamadas a red encadenadas antes de mostrar el login. El usuario ve el spinner durante 5-10 segundos.

**Solución**: 
- Eliminar el refresh manual en `initializeAuth` — Supabase ya maneja esto automáticamente en `getSession()` si el access token expiró pero el refresh token es válido.
- Si `getSession()` devuelve `null` (refresh token inválido o inexistente), ir directo al login sin intentar más recuperaciones.
- Eliminar el bloque de "recuperación" en el listener de `SIGNED_OUT` — cuando el servidor dice que el refresh token no existe, ya no hay nada que recuperar y ese intento agrega latencia innecesaria.
- Corregir el bug de doble condición `TOKEN_REFRESHED` (el `return` prematuro hace que el segundo `if` nunca se ejecute).

```typescript
// ANTES (buggy):
const initializeAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    // ok
  } else {
    // intento innecesario — getSession ya hace refresh internamente
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData.session?.user) { ... }
    else { /* sin sesión */ }
  }
};

// DESPUÉS (correcto):
const initializeAuth = async () => {
  // getSession() ya usa el refresh token si el access token expiró
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    setSession(session); setUser(session.user);
    await fetchUserData(session.user.id);
  } else {
    // No hay sesión recuperable → ir al login directamente
    setSession(null); setUser(null);
  }
};
```

#### 2. `src/hooks/useAuth.tsx` — Listener `SIGNED_OUT` sin bucle de recuperación

Cuando el servidor invalida el refresh token (`refresh_token_not_found`), Supabase emite `SIGNED_OUT`. El código actual intenta `getSession()` otra vez, que inevitablemente falla también (el refresh token ya está invalidado). Esto agrega latencia sin beneficio.

```typescript
// ELIMINAR este bloque que no sirve cuando el refresh token está invalidado:
if (event === 'SIGNED_OUT' && session === null) {
  const { data } = await supabase.auth.getSession(); // siempre falla acá
  ...
}
```

#### 3. `src/hooks/useSessionKeepAlive.ts` — Refresh más agresivo al despertar

El `VISIBILITY_REFRESH_MIN_INTERVAL` actual es de 10 minutos. Si el usuario abre la app después de 2 horas, el sistema sí intenta refrescar, pero si el access token Y el refresh token ya expiraron, es demasiado tarde.

**Solución**: Al despertar (`visibilitychange` a `visible`), verificar si el access token expiró usando `session.expires_at`. Si expiró hace más de cierto tiempo, hacer el refresh sin esperar el mínimo de 10 minutos.

```typescript
const handleVisibility = () => {
  if (document.visibilityState === 'visible') {
    updateActivity();
    // Forzar refresh sin importar cuándo fue el último
    setTimeout(forceRefreshOnWake, 500);
  }
};
```

Además, reducir `VISIBILITY_REFRESH_MIN_INTERVAL` de 10 minutos a 0 (siempre refrescar al despertar) — el throttle de `isRefreshing.current` ya previene llamadas duplicadas.

### Archivos a modificar

1. **`src/hooks/useAuth.tsx`**
   - Simplificar `initializeAuth`: quitar el `refreshSession()` manual (ya lo hace `getSession()` internamente)
   - Eliminar el bloque de recuperación en `SIGNED_OUT` 
   - Corregir el bug de doble `TOKEN_REFRESHED`

2. **`src/hooks/useSessionKeepAlive.ts`**
   - Quitar `VISIBILITY_REFRESH_MIN_INTERVAL` del guard en `forceRefreshOnWake` (siempre refrescar al reabrir)
   - Simplificar `handleVisibility` para que no tenga throttle al despertar

### Resultado esperado

| Situación | Antes | Después |
|---|---|---|
| Reabrir tras pocas horas (token aún válido) | Carga rápida ✅ | Carga rápida ✅ |
| Reabrir tras muchas horas (access token expirado, refresh válido) | A veces funciona, a veces cierra sesión | Siempre recupera la sesión ✅ |
| Reabrir tras 7+ días (refresh token expirado) | 5-10s cargando, luego login | 1-2s cargando, luego login ✅ |
| Spinner largo al reabrir | ❌ Hasta 10 segundos | ✅ Máximo 2-3 segundos |

