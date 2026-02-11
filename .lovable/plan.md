

## Plan: Conectar observaciones de partes diarios con Mantenimiento

### Objetivo
Crear una nueva pestana "Reportes de Campo" en la pagina de Mantenimiento que muestre automaticamente todas las observaciones que los operadores reportan sobre las maquinas en sus partes diarios (cuando marcan estado_maquina = 'OBSERVACION'). El equipo de mantenimiento podra ver estos reportes y marcarlos como atendidos mediante un checklist.

### Cambios

#### 1. Nueva tabla `observaciones_maquina_estado` (migracion SQL)
Tabla para rastrear el estado de atencion de cada observacion reportada:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid PK | Identificador |
| parte_diario_id | uuid FK | Referencia al parte que origino la observacion |
| maquinaria_id | uuid | Maquina reportada |
| fecha_reporte | date | Fecha del reporte |
| observacion | text | Texto de la observacion |
| atendida | boolean | Si fue atendida o no (checklist) |
| atendida_por | text | Quien la atendio |
| fecha_atencion | timestamp | Cuando se marco como atendida |
| notas_resolucion | text | Notas sobre como se resolvio |
| created_at | timestamp | Fecha de creacion |

RLS: admins y capataces pueden gestionar; maquinistas pueden ver.

Ademas, un trigger que al insertar/actualizar un parte_diario con estado_maquina = 'OBSERVACION', cree automaticamente un registro en esta tabla (si no existe ya para ese parte_diario_id).

#### 2. Nuevo hook `useObservacionesMaquina.ts`
- Query para traer observaciones con datos de maquinaria y personal (via parte_diario)
- Mutation para marcar como atendida (toggle checklist) con notas de resolucion
- Filtros por estado (pendientes/atendidas) y por maquinaria

#### 3. Nuevo componente `ObservacionesCampoTab.tsx`
Una pestana dentro de MantenimientoPage con:
- **KPIs superiores**: Total observaciones pendientes, atendidas hoy, por maquina mas reportada
- **Lista de observaciones** en formato card:
  - Nombre y codigo de la maquina
  - Fecha del reporte y nombre del operador
  - Texto de la observacion
  - Checkbox para marcar como "Atendida"
  - Al marcar atendida, se despliega un campo para notas de resolucion y quien la atendio
- **Filtros**: Pendientes / Atendidas / Todas, y buscador por maquina
- Las pendientes se muestran primero, ordenadas por fecha (mas antiguas arriba para priorizar)

#### 4. Modificar `MantenimientoPage.tsx`
- Agregar sistema de tabs: "Mantenimientos" (contenido actual) y "Reportes de Campo" (nuevo)
- El tab de Reportes de Campo muestra el componente ObservacionesCampoTab
- Mostrar un badge con la cantidad de observaciones pendientes en el tab

### Detalle tecnico

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Nueva tabla `observaciones_maquina_estado` + trigger automatico |
| `src/hooks/useObservacionesMaquina.ts` (nuevo) | Hook para CRUD de observaciones |
| `src/components/mantenimiento/ObservacionesCampoTab.tsx` (nuevo) | UI del tab con checklist |
| `src/pages/MantenimientoPage.tsx` | Agregar tabs y el nuevo componente |

### Flujo de datos

1. Operador completa parte diario y marca "OBSERVACION" con detalle
2. Trigger en BD crea automaticamente un registro en `observaciones_maquina_estado` con atendida = false
3. Equipo de mantenimiento abre la pestana "Reportes de Campo"
4. Ve todas las observaciones pendientes, las va marcando como atendidas con notas
5. Las atendidas pasan al filtro "Atendidas" para historial

### Resultado esperado
- El equipo de mantenimiento ve en tiempo real todas las observaciones reportadas por los operadores
- Pueden gestionar un checklist de problemas pendientes por resolver
- Se mantiene un historial de que se resolvio, cuando y por quien

