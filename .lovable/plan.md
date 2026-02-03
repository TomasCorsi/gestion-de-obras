
## Plan: Corregir duplicación de Partes Diarios

### Problema identificado
Encontré duplicados en la base de datos con dos patrones:
1. **Doble-click en botones**: Partes creados con 1-3 minutos de diferencia (usuarios haciendo click múltiple)
2. **Reingreso al sistema**: Partes creados con 5-9 horas de diferencia (usuarios volviendo a cargar un parte ya completado)

### Causas raíz

**Problema 1 - Doble-click:**
Los botones "Guardar Borrador" y "Completar" no previenen envíos múltiples. Aunque hay un estado `isSaving`, el código actual permite que se disparen múltiples llamadas antes de que se actualice el estado.

**Problema 2 - Reingreso:**
El hook `useParteDiario` solo busca un `borradorHoy` (estado='borrador') para la fecha actual. Si el empleado ya completó un parte hoy y vuelve a entrar, `borradorHoy` es `null`, entonces:
- Cuando presiona "Nuevo Parte" → va al formulario vacío
- Cuando presiona "Completar" → crea un NUEVO parte en vez de actualizar el existente

### Solución propuesta

#### 1. Agregar búsqueda de parte existente (no solo borrador)
```typescript
// Nuevo query: buscar cualquier parte de hoy (borrador O completado)
const { data: parteHoy = null } = useQuery({
  queryKey: ['parte_hoy', empleado?.id, fechaHoy],
  enabled: !!empleado?.id,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('partes_diarios')
      .select(...)
      .eq('personal_id', empleado!.id)
      .eq('fecha', fechaHoy)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },
});
```

#### 2. Modificar lógica de guardado para usar parte existente
```typescript
const saveDraft = async (data: ParteDiarioInsert) => {
  const parteExistente = parteHoy;
  if (parteExistente) {
    // Actualizar el parte existente
    await updateMutation.mutateAsync({ id: parteExistente.id, ...parteData });
  } else {
    await createMutation.mutateAsync(parteData);
  }
};
```

#### 3. Prevenir doble-click con debounce y estado de pending
```typescript
// En ParteDiarioFormView.tsx
const [isSubmitting, setIsSubmitting] = useState(false);

const handleComplete = async () => {
  if (isSubmitting) return; // Prevenir doble-click
  setIsSubmitting(true);
  try {
    await onComplete(buildParteData());
  } finally {
    setIsSubmitting(false);
  }
};

// Deshabilitar botón mientras está enviando
<Button 
  disabled={isSubmitting || isSaving}
  onClick={handleComplete}
>
```

#### 4. Mostrar alerta si ya existe un parte completado hoy
En la pantalla Home, si existe un parte completado hoy, mostrar una alerta:
```
"Ya completaste tu parte de hoy. Puedes editarlo desde 'Ver Mis Partes'"
```

#### 5. Agregar constraint único en la base de datos (preventivo)
Crear una restricción única para prevenir duplicados a nivel de base de datos:
```sql
CREATE UNIQUE INDEX unique_parte_por_dia 
ON partes_diarios (personal_id, fecha)
WHERE estado = 'completado';
```
Esto permite múltiples borradores pero solo un completado por día.

### Archivos a modificar
- `src/hooks/useParteDiario.ts` - agregar query de parteHoy y modificar lógica de guardado
- `src/components/parte-diario/ParteDiarioFormView.tsx` - prevenir doble-click
- `src/components/parte-diario/ParteDiarioHomeView.tsx` - mostrar alerta de parte existente
- `src/pages/ParteDiario.tsx` - usar parteHoy en vez de solo borradorHoy
- Nueva migración SQL para el índice único

### Bonus: Limpieza de duplicados existentes
Preparar un script SQL para identificar y eliminar duplicados, conservando el más reciente:
```sql
-- Identificar duplicados a eliminar (conservando el más reciente)
DELETE FROM partes_diarios pd1
WHERE EXISTS (
  SELECT 1 FROM partes_diarios pd2
  WHERE pd1.personal_id = pd2.personal_id
    AND pd1.fecha = pd2.fecha
    AND pd1.created_at < pd2.created_at
);
```
