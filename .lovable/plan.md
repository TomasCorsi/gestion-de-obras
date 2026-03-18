

# Fix: Spinner infinito al completar parte diario (chofer)

## Diagnóstico

El problema está en el manejo de errores entre `ParteDiario.tsx` y `ParteDiarioFormView.tsx`:

1. **`handleComplete` en `ParteDiario.tsx` (línea 289)** no tiene `try/catch`. Si `completeParte` lanza un error (ej: violación de unique constraint, timeout de red), la función lanza una excepción no capturada.

2. **El form (`ParteDiarioFormView.tsx` línea 294)** tiene `try/finally` que resetea `savingType`, pero la excepción no capturada puede causar comportamiento inconsistente entre `savingType` local y `isSaving` del hook, dependiendo del timing de React.

3. **Causa probable del error de fondo**: El trigger `sync_horas_km_from_parte` se ejecuta al completar el parte. Si hay algún conflicto en la tabla `horas_maquina` (ON CONFLICT DO NOTHING) o la actualización de `maquinarias` falla silenciosamente, la transacción podría quedar colgada en ciertos escenarios de red lenta.

## Solución

### 1. Agregar `try/catch` en `handleComplete` y `handleSaveDraft` de `ParteDiario.tsx`

```typescript
const handleComplete = async (data: any) => {
  try {
    await completeParte(data, editingParte?.id);
    handleBack();
  } catch (error) {
    console.error('Error completing parte:', error);
    // El toast de error ya lo muestra el hook
  }
};

const handleSaveDraft = async (data: any) => {
  try {
    await saveDraft(data, editingParte?.id);
    handleBack();
  } catch (error) {
    console.error('Error saving draft:', error);
  }
};
```

### 2. Agregar timeout de seguridad en `ParteDiarioFormView.tsx`

Para evitar que el spinner quede infinito si la petición se cuelga, agregar un timeout que resetee el estado:

```typescript
const handleComplete = async () => {
  if (savingType !== null || isSaving) return;
  if (!validateForComplete()) return;
  setSavingType('complete');
  
  const timeout = setTimeout(() => {
    setSavingType(null);
    toast.error('La operación tardó demasiado. Intenta nuevamente.');
  }, 15000); // 15 segundos máx

  try {
    await onComplete(buildParteData());
    clearDraft();
  } catch {
    // Error ya manejado por el hook
  } finally {
    clearTimeout(timeout);
    setSavingType(null);
  }
};
```

Mismo patrón para `handleSaveDraft`.

## Archivos a modificar

- **`src/pages/ParteDiario.tsx`** — Agregar try/catch en `handleComplete` y `handleSaveDraft`
- **`src/components/parte-diario/ParteDiarioFormView.tsx`** — Agregar catch al try/finally + timeout de seguridad de 15s

## Impacto
Cambio mínimo, solo manejo de errores. No toca la base de datos ni la lógica de negocio. Aplica para todos los roles, no solo chofer.

