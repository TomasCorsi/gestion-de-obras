

# Plan: Usar remito_local como numero principal

## Problema
Al crear un remito nuevo, el campo `numero` se guarda con un valor auto-generado ("REM-2026-0090") en vez del número manual ingresado en `remito_local`. Esto causa inconsistencia entre lo que el usuario carga y lo que se guarda en la base de datos.

## Solución
En `src/components/remitos/RemitoQuickFormDialog.tsx`, línea 225, cambiar la lógica para que `numero` use el valor de `remito_local` cuando esté disponible, y solo caiga al auto-generado como fallback.

**Cambio:**
```typescript
// Antes
numero: editingRemito ? editingRemito.remito_local || generateNumero() : generateNumero(),

// Después
numero: form.remito_local || generateNumero(),
```

Esto aplica tanto para creación como edición: si el usuario ingresó un número de remito local, ese se usa como `numero` principal.

### Archivo a modificar
- `src/components/remitos/RemitoQuickFormDialog.tsx` (1 línea)

