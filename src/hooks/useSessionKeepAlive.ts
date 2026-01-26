import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutos
const ACTIVITY_TIMEOUT = 5 * 60 * 1000;  // 5 minutos sin actividad = inactivo
const RETRY_DELAY = 5000; // 5 segundos para reintentar

export function useSessionKeepAlive(isAuthenticated: boolean) {
  const lastActivity = useRef(Date.now());
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const isRefreshing = useRef(false);

  // Registrar actividad del usuario silenciosamente
  const updateActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  // Renovar sesión silenciosamente
  const silentRefresh = useCallback(async () => {
    if (!isAuthenticated || isRefreshing.current) return;

    const isActive = Date.now() - lastActivity.current < ACTIVITY_TIMEOUT;
    
    if (!isActive) {
      console.debug('[Session] User inactive, skipping refresh');
      return;
    }

    isRefreshing.current = true;

    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.warn('[Session] Refresh failed, retrying...', error.message);
        // Reintentar una vez después de un delay
        setTimeout(async () => {
          try {
            const { error: retryError } = await supabase.auth.refreshSession();
            if (retryError) {
              console.error('[Session] Retry also failed:', retryError.message);
            } else {
              console.debug('[Session] Token refreshed on retry');
            }
          } catch (e) {
            console.error('[Session] Retry error:', e);
          }
        }, RETRY_DELAY);
      } else if (data.session) {
        console.debug('[Session] Token refreshed silently');
      }
    } catch (e) {
      console.warn('[Session] Silent refresh error:', e);
    } finally {
      isRefreshing.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Escuchar actividad del usuario
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => 
      window.addEventListener(event, updateActivity, { passive: true })
    );

    // Renovar periódicamente
    refreshIntervalRef.current = setInterval(silentRefresh, REFRESH_INTERVAL);

    // Renovar también cuando la pestaña vuelve a estar visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
        // Pequeño delay para evitar conflictos
        setTimeout(silentRefresh, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Renovar al montar si el usuario está autenticado
    silentRefresh();

    return () => {
      events.forEach(event => 
        window.removeEventListener(event, updateActivity)
      );
      document.removeEventListener('visibilitychange', handleVisibility);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, updateActivity, silentRefresh]);
}
