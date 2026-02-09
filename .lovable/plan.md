

## Plan: Permitir al admin cargar datos en el tab Repartidor de Gastos

### Problema actual

El tab "Repartidor" en Gastos es solo de lectura. El admin no puede agregar, editar ni eliminar cargas de combustible del repartidor desde esta vista.

### Complicacion tecnica

La tabla `cargas_combustible_repartidor` requiere un `parte_diario_id` (NOT NULL). Cuando el repartidor carga desde su parte diario, este campo se llena automaticamente. Para que el admin pueda cargar sin un parte diario, hay dos opciones:

1. Hacer `parte_diario_id` nullable (requiere migracion)
2. Hacer que el admin seleccione un parte diario existente del repartidor

Se recomienda la **opcion 1** (hacer nullable) ya que es mas practico para el admin no depender de que exista un parte diario previo.

### Cambios

#### 1. Migracion SQL

- Hacer `parte_diario_id` nullable en `cargas_combustible_repartidor`

```sql
ALTER TABLE cargas_combustible_repartidor 
ALTER COLUMN parte_diario_id DROP NOT NULL;
```

#### 2. Hook `useCargasRepartidorAll.ts`

Agregar mutaciones de create, update y delete (similar al patron de `useCargasRepartidor.ts`):

- `createCarga`: inserta un registro sin `parte_diario_id`
- `updateCarga`: actualiza un registro existente
- `deleteCarga`: elimina un registro
- Invalidar la query `cargas_combustible_repartidor_all` en cada mutacion

#### 3. Nuevo componente: `CargaRepartidorAdminDialog.tsx`

Un dialog adaptado para el admin con los campos:

- Fecha (date input)
- Operador (Combobox con lista de personal)
- Maquinaria (Combobox con lista de maquinarias)
- Obra (Combobox con obras activas)
- Litros (requerido)
- Horas y Km (opcionales)
- Observaciones

Reutiliza la misma estructura del `CargaCombustibleRepartidorDialog` existente pero sin requerir `parte_diario_id`.

#### 4. Actualizar `CombustibleRepartidorTab.tsx`

- Agregar boton "Nueva Carga" en la barra de filtros
- Agregar columna de acciones (editar/eliminar) en cada fila de la tabla
- Integrar el dialog de creacion/edicion
- Integrar dialog de confirmacion de eliminacion
- Recibir `personal`, `maquinarias` y `obras` como props (ya disponibles en `Gastos.tsx`)

#### 5. Actualizar `Gastos.tsx`

- Pasar `personal`, `maquinarias` y `obras` como props al `CombustibleRepartidorTab`

### Archivos a modificar/crear

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Hacer `parte_diario_id` nullable |
| `src/hooks/useCargasRepartidorAll.ts` | Agregar mutaciones CRUD |
| `src/components/gastos/CargaRepartidorAdminDialog.tsx` | Nuevo dialog para crear/editar |
| `src/components/gastos/CombustibleRepartidorTab.tsx` | Agregar botones de accion, integrar dialog |
| `src/pages/Gastos.tsx` | Pasar props al tab |

