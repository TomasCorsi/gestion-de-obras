
# Plan: Vista de Administrador para Partes Diarios

## Objetivo

Permitir a los administradores ver todos los partes diarios de todos los empleados, con la capacidad de filtrar por empleado, fecha, y ver el detalle completo de cada parte.

## Situación Actual

| Componente | Comportamiento Actual |
|------------|----------------------|
| `useParteDiario.ts` | Solo carga partes del empleado logueado (`empleado.id`) |
| `ParteDiario.tsx` | Requiere que el usuario tenga un perfil de empleado vinculado |
| `ParteDiarioListView.tsx` | Muestra "Mis Partes" - solo los partes del usuario |
| Políticas RLS | Admin ya puede ver todos los partes vía `has_role(auth.uid(), 'admin')` |

## Solución Propuesta

Crear una nueva sección para administradores que muestre todos los partes diarios de todos los empleados, separada de la vista de empleados.

### Arquitectura

```text
/parte-diario
├── Vista Empleado (actual)
│   └── Solo ve sus propios partes
│
└── Vista Admin/Capataz (nueva)
    ├── Lista de TODOS los partes
    ├── Filtros por empleado, fecha, estado
    └── Detalle de cada parte (solo lectura)
```

## Componentes a Crear/Modificar

### 1. Nuevo Hook: `useParteDiarioAdmin.ts`

| Característica | Descripción |
|----------------|-------------|
| Consulta | Trae todos los partes diarios sin filtrar por `personal_id` |
| Joins | Incluye datos de empleado, obra y maquinaria |
| Ordenamiento | Por fecha descendente |
| Solo lectura | No incluye funciones de creación/edición |

### 2. Nuevo Componente: `ParteDiarioAdminView.tsx`

Vista con tabla/lista que muestra:

| Columna | Datos |
|---------|-------|
| Fecha | Fecha del parte |
| Empleado | Nombre completo y rol |
| Obra | Nombre de la obra asignada |
| Máquina | Código/tipo de maquinaria |
| Horario | Entrada - Salida |
| Estado | Borrador / Completado |
| Acción | Ver detalle |

### 3. Nuevo Componente: `ParteDiarioAdminFilters.tsx`

Filtros para:
- Empleado (selector con todos los empleados)
- Rango de fechas
- Estado (borrador/completado)
- Obra

### 4. Modificar: `ParteDiario.tsx`

Detectar si el usuario es admin/capataz y mostrar:
- **Si es admin/capataz**: Vista administrativa con todos los partes
- **Si es empleado**: Vista actual con sus propios partes

## Flujo de Navegación

```text
Admin ingresa a /parte-diario
         ↓
¿Tiene rol admin o capataz?
         ↓
    SÍ → Mostrar ParteDiarioAdminView
         ├── Tabla con todos los partes
         ├── Filtros arriba
         └── Click en fila → ParteDiarioDetailDialog
         
    NO → Mostrar vista actual (ParteDiarioHomeView)
         └── Solo sus propios partes
```

## Cambios Detallados

### Archivo: `src/hooks/useParteDiarioAdmin.ts` (nuevo)

Hook que consulta todos los partes diarios para administradores:
- Query sin filtro de `personal_id`
- Incluye join con tabla `personal` para nombre/rol del empleado
- Ordenado por fecha descendente
- Opciones de filtrado por fecha, empleado, estado

### Archivo: `src/components/parte-diario/ParteDiarioAdminView.tsx` (nuevo)

Componente principal de la vista administrativa:
- Barra de filtros en la parte superior
- Tabla/grilla con todos los partes
- Reutiliza `ParteDiarioDetailDialog` para ver detalles
- Indicador del empleado en cada fila

### Archivo: `src/pages/ParteDiario.tsx` (modificar)

Agregar lógica condicional:
- Usar `useAuth()` para obtener el rol
- Si es `admin` o `capataz`: renderizar `ParteDiarioAdminView`
- Si no: mantener comportamiento actual para empleados

## Políticas RLS (sin cambios necesarios)

Las políticas actuales ya permiten a admins ver todos los partes:

```sql
-- Política existente
"Admins and capataces can manage all partes"
USING: (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'))
```

## Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useParteDiarioAdmin.ts` | Hook para consultar todos los partes |
| `src/components/parte-diario/ParteDiarioAdminView.tsx` | Vista principal para admins |
| `src/components/parte-diario/ParteDiarioAdminFilters.tsx` | Componente de filtros |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/ParteDiario.tsx` | Agregar lógica condicional según rol |
| `src/components/parte-diario/ParteDiarioDetailDialog.tsx` | Mostrar nombre del empleado en el detalle |

## Beneficios

1. Los administradores pueden supervisar todos los partes diarios
2. Pueden identificar empleados que no completaron sus partes
3. Pueden revisar observaciones de máquinas reportadas
4. Los empleados mantienen su vista simplificada actual
5. Reutiliza el componente de detalle existente

## Pruebas Recomendadas

1. Ingresar como admin y verificar que se ve la vista administrativa
2. Verificar que aparecen partes de todos los empleados
3. Probar los filtros por empleado, fecha y estado
4. Verificar que el detalle muestra toda la información correctamente
5. Ingresar como empleado normal y verificar que solo ve sus partes
