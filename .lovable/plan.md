

# Plan: Optimizar Toggle de Pago sin Reiniciar Tabla

## Problema Actual

Cuando cambias el estado de pago de una vacación, la función `togglePagada` ejecuta `fetchVacaciones()` que:
1. Activa el estado `loading = true`
2. Muestra el Skeleton de carga (tabla desaparece)
3. Recarga todos los datos desde la base de datos
4. Desactiva `loading = false` (tabla reaparece)

Esto causa el efecto visual de "reinicio" de la tabla.

## Solución

Actualizar el estado local inmediatamente sin recargar todos los datos. Esto se conoce como "optimistic update" (actualización optimista).

## Archivo a Modificar

`src/hooks/useVacaciones.ts`

## Cambios

### Función `togglePagada` - Actualización Optimista

Cambiar de:
```typescript
const togglePagada = async (id: string) => {
  const vacacion = vacaciones.find(v => v.id === id);
  if (!vacacion) return false;

  const newPagada = !vacacion.pagada;
  const { error } = await supabase
    .from("vacaciones")
    .update({ pagada: newPagada })
    .eq("id", id);

  // ...
  await fetchVacaciones(); // <-- Esto recarga todo
  return true;
};
```

A:
```typescript
const togglePagada = async (id: string) => {
  const vacacion = vacaciones.find(v => v.id === id);
  if (!vacacion) return false;

  const newPagada = !vacacion.pagada;
  
  // 1. Actualizar estado local inmediatamente (optimistic update)
  setVacaciones(prev => 
    prev.map(v => v.id === id ? { ...v, pagada: newPagada } : v)
  );

  // 2. Luego actualizar en la base de datos
  const { error } = await supabase
    .from("vacaciones")
    .update({ pagada: newPagada })
    .eq("id", id);

  if (error) {
    // 3. Si hay error, revertir el cambio local
    setVacaciones(prev => 
      prev.map(v => v.id === id ? { ...v, pagada: !newPagada } : v)
    );
    toast.error("Error al actualizar estado de pago");
    return false;
  }

  toast.success(newPagada ? "Vacaciones marcadas como pagadas" : "Vacaciones marcadas como no pagadas");
  return true;
  // Ya no se llama a fetchVacaciones()
};
```

## Beneficios

| Antes | Después |
|-------|---------|
| Tabla parpadea/reinicia | Cambio instantáneo sin parpadeo |
| Recarga 40+ registros | Solo actualiza 1 registro en memoria |
| Loading skeleton visible | Sin skeleton |
| Posición de scroll se pierde | Scroll se mantiene |

## Resumen

Solo se modifica la función `togglePagada` en `src/hooks/useVacaciones.ts` para usar actualización optimista del estado local en lugar de recargar todos los datos.

