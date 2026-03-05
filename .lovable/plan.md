

# Historial de mantenimientos del mecánico con navegador de fechas

## Resumen
Replicar el patrón del repartidor calecita: un navegador de fecha con flechas (izquierda/derecha) que muestra los mantenimientos del mecánico para el día seleccionado, con opciones de editar y eliminar cada registro.

## Cambios

### 1. `src/pages/ParteDiario.tsx`
- Agregar estado `selectedDateMecanico` con navegación `handlePrevDayMec` / `handleNextDayMec` (mismo patrón que repartidor)
- Filtrar `mantenimientos` por `tecnico_id === empleado.id` y por fecha seleccionada → `mantenimientosFechaSeleccionada`
- Agregar estado `deletingMantenimiento` y lógica de eliminación con `DeleteConfirmDialog`
- Pasar props nuevas al `ParteDiarioHomeView`: `selectedDateMecanico`, `isTodayMecanico`, `mantenimientosDia`, `onPrevDayMec`, `onNextDayMec`, `onEditMantenimiento`, `onDeleteMantenimiento`

### 2. `src/components/parte-diario/ParteDiarioHomeView.tsx`
- Agregar sección para mecánicos debajo de los botones, con el mismo layout del repartidor:
  - Flechas izq/der + fecha centrada
  - Lista de tarjetas del día con máquina, tipo (badge), estado (badge), descripción truncada
  - Botones de editar (lápiz) y eliminar (papelera) en cada tarjeta
  - Contador: "X mantenimientos"
  - Texto vacío si no hay registros ese día
- La sección de "pendientes" (que ya existe) se mantiene arriba como acceso rápido a los borradores

### 3. Base de datos: nueva RLS policy
Los mecánicos actualmente no tienen permiso DELETE en `mantenimientos`. Se agrega:
```sql
CREATE POLICY "Mecanicos personal can delete mantenimientos"
ON public.mantenimientos FOR DELETE
USING (is_personal_mecanico(auth.uid()));
```

