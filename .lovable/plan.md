
# Plan: Renovación de Sesión Silenciosa y Automática

## Objetivo
Hacer que la sesión se mantenga activa indefinidamente mientras el usuario esté usando la aplicación, sin mostrar ningún banner, advertencia ni interrupción. La renovación debe ocurrir 100% en segundo plano, como cualquier aplicación moderna.

## Estrategia

El problema actual es que aunque `autoRefreshToken: true` está configurado, cuando falla silenciosamente no hay recuperación. Implementaremos un sistema de renovación proactiva invisible.

## Cambios Técnicos

### 1. Hook de Renovación Silenciosa en Segundo Plano

**Archivo nuevo: `src/hooks/useSessionKeepAlive.ts`**

Este hook se ejecutará silenciosamente y:
- Renovará la sesión automáticamente cada 45 minutos (antes de que expire el token de 1 hora)
- Detectará cualquier fallo de renovación y reintentará automáticamente
- Detectará actividad del usuario (clicks, teclas, scroll) para saber si está activo
- Solo renovará si el usuario está activo (evita renovaciones innecesarias)

```text
Lógica del hook:
┌──────────────────────────────────────┐
│  Usuario usa la app normalmente      │
│  (sin saber que existe este hook)    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Cada 45 min: ¿Usuario activo?       │
│  (detecta clicks/teclas recientes)   │
└──────────────┬───────────────────────┘
               │
      ┌────────┴────────┐
      │ Sí              │ No
      ▼                 ▼
┌─────────────┐   ┌─────────────────┐
│ Renovar     │   │ No hacer nada   │
│ sesión      │   │ (ahorra recursos│
└─────────────┘   └─────────────────┘
```

### 2. Manejo Mejorado de Eventos de Auth

**Archivo modificado: `src/hooks/useAuth.tsx`**

Agregar manejo de eventos silencioso:
- `TOKEN_REFRESHED`: Log interno (sin mostrar nada al usuario)
- `SIGNED_OUT` inesperado: Intentar recuperar sesión automáticamente antes de redirigir
- Agregar función `refreshSession()` para uso interno

### 3. Integración en la App

**Archivo modificado: `src/App.tsx`**

- Agregar el hook `useSessionKeepAlive` dentro del `AuthProvider`
- No se agrega ningún componente visual

## Código del Hook Principal

```typescript
// src/hooks/useSessionKeepAlive.ts
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutos
const ACTIVITY_TIMEOUT = 5 * 60 * 1000;  // 5 minutos sin actividad = inactivo

export function useSessionKeepAlive() {
  const lastActivity = useRef(Date.now());
  const refreshIntervalRef = useRef<NodeJS.Timeout>();

  // Registrar actividad del usuario silenciosamente
  const updateActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  // Renovar sesión silenciosamente
  const silentRefresh = useCallback(async () => {
    const isActive = Date.now() - lastActivity.current < ACTIVITY_TIMEOUT;
    
    if (!isActive) return; // Usuario inactivo, no renovar

    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[Session] Refresh failed, retrying...', error);
        // Reintentar una vez
        setTimeout(async () => {
          await supabase.auth.refreshSession();
        }, 5000);
      }
    } catch (e) {
      console.warn('[Session] Silent refresh error:', e);
    }
  }, []);

  useEffect(() => {
    // Escuchar actividad del usuario
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => 
      window.addEventListener(event, updateActivity, { passive: true })
    );

    // Renovar periódicamente
    refreshIntervalRef.current = setInterval(silentRefresh, REFRESH_INTERVAL);

    // Renovar también cuando la pestaña vuelve a estar visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
        silentRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      events.forEach(event => 
        window.removeEventListener(event, updateActivity)
      );
      document.removeEventListener('visibilitychange', handleVisibility);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [updateActivity, silentRefresh]);
}
```

## Modificaciones a useAuth.tsx

Agregar manejo de eventos y recuperación automática:

```typescript
// Dentro del onAuthStateChange
(event, session) => {
  // Log silencioso para debugging (solo en consola de desarrollo)
  if (event === 'TOKEN_REFRESHED') {
    console.debug('[Auth] Token refreshed silently');
  }
  
  // Si se cierra sesión inesperadamente, intentar recuperar
  if (event === 'SIGNED_OUT' && session === null) {
    // Verificar si hay sesión guardada que podamos recuperar
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Había sesión, restaurarla
        setSession(data.session);
        setUser(data.session.user);
      }
    });
  }
  
  // ... resto del código existente
}
```

## Componente de Integración

**Archivo nuevo: `src/components/auth/SessionKeepAlive.tsx`**

```typescript
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';
import { useAuth } from '@/hooks/useAuth';

export function SessionKeepAlive() {
  const { user } = useAuth();
  
  // Solo activar si hay usuario logueado
  useSessionKeepAlive(!!user);
  
  return null; // No renderiza nada
}
```

## Resultado Final

| Antes | Después |
|-------|---------|
| Sesión expira y cierra sin aviso | Sesión se renueva automáticamente cada 45 min |
| Sin manejo de errores de refresh | Reintento automático si falla la renovación |
| Sin detección de actividad | Solo renueva si el usuario está activo |
| Sin recuperación al volver a la pestaña | Renueva inmediatamente al volver a la pestaña |

El usuario nunca verá ningún mensaje ni interrupción. La aplicación funcionará exactamente como cualquier otra aplicación moderna donde simplemente "no te cierra la sesión".
