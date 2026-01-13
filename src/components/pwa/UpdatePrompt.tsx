import { useServiceWorker } from '@/hooks/useServiceWorker';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Wifi } from 'lucide-react';

export function UpdatePrompt() {
  const { 
    needRefresh, 
    offlineReady, 
    updateServiceWorker, 
    dismissUpdate,
    dismissOfflineReady 
  } = useServiceWorker();

  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                Nueva versión disponible
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Hay una actualización lista para instalar. Actualiza ahora para obtener las últimas mejoras.
              </p>
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={updateServiceWorker}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar ahora
                </Button>
                <Button 
                  onClick={dismissUpdate}
                  variant="ghost"
                  size="sm"
                >
                  Más tarde
                </Button>
              </div>
            </div>
            <button 
              onClick={dismissUpdate}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-green-500/10 rounded-full">
              <Wifi className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">
                App lista para uso offline
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                La aplicación está instalada y disponible sin conexión a internet.
              </p>
            </div>
            <button 
              onClick={dismissOfflineReady}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
