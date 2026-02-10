

## Plan: Ampliar el registro del Repartidor con tipos de producto y acceso directo

### Que cambia

Actualmente el repartidor solo puede cargar combustible desde dentro del formulario de Parte Diario, y solo despues de guardar un borrador. Este plan hace dos cosas:

1. **Acceso directo desde el inicio**: Agrega un boton en la pantalla principal del Repartidor para registrar entregas sin necesidad de abrir el formulario completo del parte
2. **Nuevos tipos de producto**: Ademas de Combustible, el repartidor podra registrar entregas de Grasa, Aceite y Uria

### Flujo propuesto para el Repartidor

La pantalla principal (home) del repartidor tendra:
- Los botones existentes (Nuevo Parte, Ver Mis Partes)
- Un nuevo boton grande "Registrar Entrega" que abre directamente el dialog de carga
- El historial rapido de entregas del dia actual

Desde el dialog de carga, el repartidor selecciona el tipo de producto y la cantidad, sin depender de un parte diario guardado.

### Cambios tecnicos

#### 1. Migracion SQL (2 cambios)

```sql
-- Permitir cargas sin parte diario vinculado
ALTER TABLE cargas_combustible_repartidor 
ALTER COLUMN parte_diario_id DROP NOT NULL;

-- Agregar tipo de producto
ALTER TABLE cargas_combustible_repartidor 
ADD COLUMN tipo_producto text DEFAULT 'combustible';
```

Esto permite al repartidor (y al admin) crear registros independientes del parte diario y clasificar por tipo de insumo.

#### 2. Actualizar hook `useCargasRepartidor.ts`

- Agregar `tipo_producto` a las interfaces `CargaRepartidor` y `CargaRepartidorInsert`
- Hacer `parte_diario_id` opcional en `CargaRepartidorInsert`

#### 3. Actualizar hook `useCargasRepartidorAll.ts`

- Agregar `tipo_producto` a la interfaz `CargaRepartidorFull`

#### 4. Nuevo hook: `useCargasRepartidorByEmpleado.ts`

Un hook liviano para que el repartidor pueda ver y crear cargas desde la home sin depender de un parte diario:
- Query cargas del dia actual filtrando por `created_by` o `repartidor_id`
- Mutaciones de create/update/delete con `parte_diario_id: null`

Alternativa: reutilizar el hook existente permitiendo `parteDiarioId = null` y agregando un filtro por fecha + empleado. Esto evita crear un hook nuevo.

#### 5. Actualizar `CargaCombustibleRepartidorDialog.tsx`

- Agregar campo Select "Tipo de Producto" con opciones: Combustible, Grasa, Aceite, Uria
- Cambiar la etiqueta "Litros" dinamicamente segun el tipo (Litros para combustible, Kg para grasa, Litros para aceite/uria)
- Hacer `parte_diario_id` opcional en la llamada a `onSave`
- Incluir `tipo_producto` en los datos enviados

#### 6. Actualizar `ParteDiarioHomeView.tsx`

Solo para el rol repartidor_calecita:
- Agregar un tercer boton "Registrar Entrega" con icono de combustible
- Mostrar un resumen rapido de entregas del dia debajo de los botones
- Recibir props adicionales: `onRegistrarEntrega`, `entregasHoy` (cantidad y litros totales)

#### 7. Actualizar `ParteDiarioPage` (`ParteDiario.tsx`)

- Para el repartidor, conectar el boton de "Registrar Entrega" con el dialog de carga
- Gestionar el estado del dialog desde la pagina principal
- Usar el hook de cargas independiente del parte diario

#### 8. Actualizar `CargasCombustibleRepartidorList.tsx`

- Agregar columna "Producto" en la tabla
- Mostrar la unidad correcta segun el tipo (L, Kg)

#### 9. Actualizar `CombustibleRepartidorTab.tsx` (Gastos)

- Agregar columna "Producto" en la tabla
- Incluir `tipo_producto` en la exportacion Excel
- Actualizar estadisticas para desglosar por tipo de producto

### Archivos a modificar/crear

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Nullable `parte_diario_id` + columna `tipo_producto` |
| `src/hooks/useCargasRepartidor.ts` | Agregar `tipo_producto`, hacer `parte_diario_id` opcional |
| `src/hooks/useCargasRepartidorAll.ts` | Agregar `tipo_producto` a interfaz |
| `src/components/parte-diario/CargaCombustibleRepartidorDialog.tsx` | Agregar select de producto, unidad dinamica |
| `src/components/parte-diario/CargasCombustibleRepartidorList.tsx` | Agregar columna Producto |
| `src/components/parte-diario/ParteDiarioHomeView.tsx` | Boton "Registrar Entrega" para repartidor |
| `src/pages/ParteDiario.tsx` | Dialog de carga desde home, hook independiente |
| `src/components/gastos/CombustibleRepartidorTab.tsx` | Columna Producto + export |

