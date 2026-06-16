import { useEffect, useState, useCallback } from 'react';

export function useServiceWorker() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        const appRegistrations = registrations.filter((registration) => {
          const scriptUrl = registration.active?.scriptURL
            || registration.waiting?.scriptURL
            || registration.installing?.scriptURL
            || "";
          return registration.scope === `${window.location.origin}/` || scriptUrl.endsWith("/sw.js");
        });

        return Promise.allSettled(appRegistrations.map((registration) => registration.unregister()));
      })
      .catch(() => undefined);
  }, []);

  const handleUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  const handleDismiss = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  const handleOfflineReady = useCallback(() => {
    return undefined;
  }, []);

  const checkForUpdates = useCallback(async (): Promise<{ found: boolean; error?: string }> => {
    setIsChecking(true);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(registrations.map((registration) => registration.unregister()));
      }
      setIsChecking(false);
      return { found: false };
    } catch (error) {
      setIsChecking(false);
      return { found: false, error: String(error) };
    }
  }, []);

  return {
    needRefresh,
    offlineReady: false,
    isChecking,
    checkForUpdates,
    updateServiceWorker: handleUpdate,
    dismissUpdate: handleDismiss,
    dismissOfflineReady: handleOfflineReady,
  };
}
