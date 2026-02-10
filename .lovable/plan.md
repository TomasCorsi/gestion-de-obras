
## Plan: Historial de entregas del Repartidor en la pantalla principal

### Problema actual

El hook `useCargasRepartidor` solo consulta cargas por `parte_diario_id`. Como ahora las cargas se crean sin parte diario (directamente desde el home), al pasar `null` el hook devuelve un array vacio. El repartidor no puede ver nada de lo que cargo.

### Solucion

Agregar una vista de historial de entregas del dia en la pantalla home del repartidor, usando el hook modificado para que cuando no reciba `parteDiarioId` pero si un `repartidorId`, consulte las cargas de ese repartidor. Ademas, permitir editar y eliminar desde ahi.

### Cambios

#### 1. Modificar `useCargasRepartidor.ts`

Cambiar la firma para aceptar un segundo parametro opcional `repartidorId`. Cuando `parteDiarioId` es null pero `repartidorId` tiene valor, la query filtra por `repartidor_id` en lugar de `parte_diario_id`. Esto permite reutilizar el mismo hook sin crear uno nuevo.

```
useCargasRepartidor(parteDiarioId: string | null, repartidorId?: string | null)
```

- Si `parteDiarioId` existe: filtra por `parte_diario_id` (comportamiento actual)
- Si `repartidorId` existe y `parteDiarioId` es null: filtra por `repartidor_id`
- Si ambos son null: retorna vacio

#### 2. Modificar `ParteDiario.tsx`

- Pasar `empleado.id` como `repartidorId` al hook para obtener las cargas del repartidor
- Pasar las cargas, funciones de editar/eliminar y el dialog de edicion al home view
- Agregar estado para manejar la edicion de cargas existentes

#### 3. Modificar `ParteDiarioHomeView.tsx`

- Recibir las cargas del dia como prop
- Mostrar debajo de los botones principales una lista compacta con las entregas de hoy usando el componente `CargasCombustibleRepartidorList` existente
- Incluir botones de editar y eliminar en cada fila

#### 4. Confirmar dialog de eliminacion

Agregar `DeleteConfirmDialog` para confirmar antes de borrar una entrega.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useCargasRepartidor.ts` | Agregar parametro `repartidorId` para query alternativa |
| `src/pages/ParteDiario.tsx` | Conectar cargas del repartidor con el home view, manejar edicion |
| `src/components/parte-diario/ParteDiarioHomeView.tsx` | Mostrar lista de entregas del dia con edicion/eliminacion |
