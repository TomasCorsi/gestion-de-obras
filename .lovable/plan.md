
## Validación obligatoria de la observación de máquina

### Problema identificado

En `src/components/parte-diario/ParteDiarioFormView.tsx`, cuando el usuario selecciona "OBSERVACIÓN" en el estado de la máquina, el textarea aparece pero la función `validateForComplete()` (línea 257) **no verifica** que el campo `observacion_maquina` tenga contenido. Esto permite guardar el parte con la observación vacía.

El campo tampoco se valida al guardar como borrador, lo que significa que un operador puede guardar y completar el parte sin escribir nada en la observación.

### Cambios a realizar

**Archivo: `src/components/parte-diario/ParteDiarioFormView.tsx`**

**1. Agregar validación en `validateForComplete` (línea 257)**

Agregar una verificación: si `showEstadoMaquina` es true y `formData.estado_maquina === 'OBSERVACION'`, el campo `observacion_maquina` no puede estar vacío ni solo tener espacios en blanco.

```typescript
const validateForComplete = (): boolean => {
  if (isMaquinista && !formData.maquinaria_id) {
    toast.error('Debes seleccionar una máquina para completar el parte');
    return false;
  }
  // NUEVO: validar observación obligatoria
  if (showEstadoMaquina && formData.estado_maquina === 'OBSERVACION' && !formData.observacion_maquina.trim()) {
    toast.error('Debés describir la observación de la máquina');
    return false;
  }
  if (showHorometro) {
    const inicio = parseFloat(formData.horometro_inicio) || 0;
    const fin = parseFloat(formData.horometro_fin) || 0;
    if (fin > 0 && fin < inicio) {
      toast.error('El horómetro fin debe ser mayor al inicio');
      return false;
    }
  }
  return true;
};
```

**2. Mostrar error visual en el Textarea (línea 544)**

Agregar un estado o derivar un flag `obsError` que sea `true` cuando el estado es OBSERVACION y el campo está vacío **después de un intento de guardado fallido**. Esto muestra el textarea con borde rojo y un mensaje de error bajo el campo:

```tsx
{formData.estado_maquina === 'OBSERVACION' && (
  <div className="mt-4">
    <Textarea
      placeholder="Describa la observación de la máquina..."
      value={formData.observacion_maquina}
      onChange={(e) => handleChange('observacion_maquina', e.target.value)}
      className={cn(
        "min-h-24 text-base",
        showObsError && "border-destructive focus-visible:ring-destructive"
      )}
    />
    {showObsError && (
      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
        <span>⚠</span> Debés escribir la observación antes de continuar
      </p>
    )}
    <p className="text-xs text-muted-foreground mt-1">
      {formData.observacion_maquina.length}/0 caracteres
    </p>
  </div>
)}
```

**3. Limpiar el error cuando el usuario empieza a escribir**

Se agrega un `useState<boolean>` llamado `showObsError` que:
- Se activa (`true`) cuando `validateForComplete` detecta observación vacía
- Se limpia (`false`) cuando el usuario escribe en el textarea

**4. También validar al guardar borrador (opcional pero recomendado)**

El `handleSaveDraft` actualmente no valida nada. Para el borrador no se bloqueará (es un draft), pero se mostrará el error visual igualmente si intenta completar después. La validación dura solo aplica a `handleComplete`.

### Resumen de cambios

| Cambio | Archivo | Tipo |
|---|---|---|
| Agregar `showObsError` state | `ParteDiarioFormView.tsx` | Nuevo estado |
| Validar observación en `validateForComplete` | `ParteDiarioFormView.tsx` | Lógica de validación |
| Mostrar borde rojo + mensaje de error en Textarea | `ParteDiarioFormView.tsx` | UI feedback |
| Limpiar error al escribir | `ParteDiarioFormView.tsx` | UX |

**Sin cambios de base de datos** — es una validación puramente de frontend.
