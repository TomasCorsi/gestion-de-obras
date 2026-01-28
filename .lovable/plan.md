

# Plan: Verificación de Actualizaciones PWA Mejorada

## Resumen
Reducir el intervalo de verificación automática de 60 a 5 minutos y agregar un botón "Buscar actualizaciones" en el menú de usuario para verificación manual.

## Cambios a Implementar

### 1. Actualizar Hook useServiceWorker

| Cambio | Antes | Después |
|--------|-------|---------|
| Intervalo de verificación | 60 minutos | 5 minutos |
| Verificación manual | No disponible | Nueva función `checkForUpdates()` |
| Estado de verificación | No disponible | `isChecking` para feedback visual |

### 2. Agregar Botón en Menú de Usuario

El menú de usuario en TopNavbar incluirá una nueva opción:

```text
┌────────────────────────────┐
│ Juan Pérez                 │
│ Maquinista                 │
├────────────────────────────┤
│ 👤 Perfil                  │
│ 🔄 Buscar actualizaciones  │  ← NUEVO
├────────────────────────────┤
│ 🚪 Cerrar Sesión           │
└────────────────────────────┘
```

### 3. Feedback Visual

- Mostrar spinner mientras verifica
- Mostrar toast de éxito/resultado:
  - "Nueva versión encontrada" → aparece el UpdatePrompt automáticamente
  - "Ya tienes la última versión" → toast informativo

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useServiceWorker.ts` | Reducir intervalo + agregar `checkForUpdates()` |
| `src/components/layout/TopNavbar.tsx` | Agregar item "Buscar actualizaciones" al menú |

## Sección Técnica

### Hook Actualizado

```typescript
// useServiceWorker.ts

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
      registrationRef.current = r;
      
      // Verificar actualizaciones cada 5 MINUTOS (antes era 1 hora)
      if (r) {
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000); // 5 minutos
      }
    },
    onRegisterError(error) {
      console.log('Error al registrar SW:', error);
    },
  });

  // Nueva función: verificación manual
  const checkForUpdates = useCallback(async () => {
    if (!registrationRef.current) {
      return { found: false, error: 'Service Worker no registrado' };
    }
    
    setIsChecking(true);
    try {
      await registrationRef.current.update();
      // Dar tiempo a que se detecte la actualización
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsChecking(false);
      return { found: swNeedRefresh };
    } catch (error) {
      setIsChecking(false);
      return { found: false, error };
    }
  }, [swNeedRefresh]);

  return {
    needRefresh,
    offlineReady,
    isChecking,
    checkForUpdates, // Nueva función
    updateServiceWorker: handleUpdate,
    dismissUpdate: handleDismiss,
    dismissOfflineReady: handleOfflineReady,
  };
}
```

### TopNavbar con Botón de Actualizaciones

```typescript
// TopNavbar.tsx - Nuevo import y uso

import { useServiceWorker } from '@/hooks/useServiceWorker';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const { checkForUpdates, isChecking, needRefresh } = useServiceWorker();
  
  const handleCheckUpdates = async () => {
    const result = await checkForUpdates();
    
    if (result.found || needRefresh) {
      toast.success('Nueva versión encontrada', {
        description: 'Actualiza para obtener las últimas mejoras'
      });
    } else {
      toast.info('Ya tienes la última versión', {
        description: 'No hay actualizaciones disponibles'
      });
    }
  };

  // En el DropdownMenuContent, después de "Perfil":
  return (
    <DropdownMenuItem 
      onClick={handleCheckUpdates}
      disabled={isChecking}
      className="text-foreground focus:bg-accent cursor-pointer"
    >
      {isChecking ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4 mr-2" />
      )}
      Buscar actualizaciones
    </DropdownMenuItem>
  );
}
```

## Beneficios

1. **Actualizaciones más rápidas**: Los empleados recibirán notificaciones de nuevas versiones en máximo 5 minutos
2. **Control manual**: Si sospechan que hay una versión nueva, pueden verificar inmediatamente
3. **Feedback claro**: El usuario siempre sabe el estado de la verificación

