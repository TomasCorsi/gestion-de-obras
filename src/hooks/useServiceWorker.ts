import { useCallback } from 'react';

/**
 * Lightweight hook to surface SW update state and provide a manual update check.
 * Registration itself is handled centrally by registerAppServiceWorker() in main.tsx.
 */
export function useServiceWorker() {
  // Cleanup release: no app-shell registration or automatic reload UI.
  const needRefresh = false;
  const isChecking = false;
  const updateServiceWorker = useCallback(() => {
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => undefined, []);
  const dismissOfflineReady = useCallback(() => undefined, []);

  const checkForUpdates = useCallback(async (): Promise<{ found: boolean; error?: string }> => {
    return { found: false };
  }, []);

  return {
    needRefresh,
    offlineReady: false,
    isChecking,
    checkForUpdates,
    updateServiceWorker,
    dismissUpdate,
    dismissOfflineReady,
  };
}
