import { useEffect, useState, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useServiceWorker() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registrado:', r);
      registrationRef.current = r ?? null;
      
      // Verificar actualizaciones cada 5 MINUTOS (antes era 1 hora)
      if (r) {
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000);

        // Verificar también cuando la PWA vuelve a primer plano
        const onVisible = () => {
          if (document.visibilityState === 'visible') {
            r.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
      }
    },
    onRegisterError(error) {
      console.log('Error al registrar SW:', error);
    },
  });

  useEffect(() => {
    setNeedRefresh(swNeedRefresh);
  }, [swNeedRefresh]);

  const handleUpdate = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const handleDismiss = useCallback(() => {
    setSwNeedRefresh(false);
    setNeedRefresh(false);
  }, [setSwNeedRefresh]);

  const handleOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, [setOfflineReady]);

  // Nueva función: verificación manual
  const checkForUpdates = useCallback(async (): Promise<{ found: boolean; error?: string }> => {
    if (!registrationRef.current) {
      return { found: false, error: 'Service Worker no registrado' };
    }
    
    setIsChecking(true);
    try {
      await registrationRef.current.update();
      // Dar tiempo a que se detecte la actualización
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsChecking(false);
      return { found: swNeedRefresh };
    } catch (error) {
      setIsChecking(false);
      return { found: false, error: String(error) };
    }
  }, [swNeedRefresh]);

  return {
    needRefresh,
    offlineReady,
    isChecking,
    checkForUpdates,
    updateServiceWorker: handleUpdate,
    dismissUpdate: handleDismiss,
    dismissOfflineReady: handleOfflineReady,
  };
}
