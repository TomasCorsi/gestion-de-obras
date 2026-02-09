

## Plan: Corregir actualización instantánea del borrador en Parte Diario

### Problema

Cuando el empleado guarda un borrador y vuelve al "home", no se muestra el alerta de borrador porque la query `parte_hoy` nunca se refresca. Las mutaciones invalidan `['partes_diarios']` y `['parte_borrador']`, pero la query que alimenta `borradorHoy` usa la key `['parte_hoy', empleadoId, fecha]`, que no está incluida en las invalidaciones.

### Solución

Agregar `queryClient.invalidateQueries({ queryKey: ['parte_hoy'] })` en los callbacks `onSuccess` de las tres mutaciones (create, update, delete) en `useParteDiario.ts`.

### Cambio técnico

**Archivo: `src/hooks/useParteDiario.ts`**

En las tres mutaciones (`createMutation`, `updateMutation`, `deleteMutation`), agregar la invalidación de `['parte_hoy']` junto a las existentes:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
  queryClient.invalidateQueries({ queryKey: ['parte_hoy'] });
  // ... resto del callback
},
```

Esto garantiza que al volver a la vista "home" después de guardar, la query de `parteHoy` se refresque y muestre el alerta de borrador (o de completado) inmediatamente.

