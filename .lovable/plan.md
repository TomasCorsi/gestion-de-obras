
## Sistema de Sueldos — Nueva pestaña dentro de Liquidaciones

### Contexto
Los sueldos que están en la tabla `personal` (campos `sueldo`, `sueldo_negro`, `modalidad_pago`) no son confiables para el usuario. Se necesita un sistema independiente donde se importen los sueldos desde un Excel del estudio contable y se pueda ver un resumen cada quincena y fin de mes.

### 1. Nueva tabla `sueldos`

Crear una tabla para almacenar los sueldos importados por período:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| personal_id | uuid | Referencia al empleado |
| legajo | text | Para matching en importación |
| nombre | text | Nombre del archivo (respaldo) |
| sueldo_blanco | numeric | Monto en blanco |
| sueldo_negro | numeric | Monto en negro |
| modalidad_pago | text | 'quincenal' o 'mensual' |
| periodo | text | Ej: '2026-04' (año-mes) |
| created_at | timestamptz | |

RLS: solo admin y capataz.

### 2. Importación Excel/CSV

Un uploader dentro de la pestaña que:
- Acepta Excel o CSV con columnas: Legajo, Nombre, Blanco, Negro, Modalidad
- Matchea por legajo contra la tabla `personal`
- Muestra preview con estados (encontrado / no encontrado)
- Al confirmar, inserta en `sueldos` con el período seleccionado (mes/año)
- Si ya existe data para ese período, pregunta si reemplazar

### 3. Vista resumen "Sueldos"

Nueva sub-pestaña dentro de Liquidaciones con:

**Filtros**: Selector de período (mes/año)

**KPIs en cards**:
- Total Blanco Quincenal (quincena 1 y 2)
- Total Negro Quincenal
- Total Blanco Mensual
- Total Negro Mensual
- **Gran Total** (blanco + negro de todos)

**Tabla detallada**: Lista de empleados con columnas Legajo, Nombre, Modalidad, Blanco, Negro, Total, con filtro por modalidad y totales al pie.

### 4. Archivos a crear/modificar

- **Migración SQL**: Crear tabla `sueldos` con RLS
- **`src/hooks/useSueldos.ts`**: Hook para CRUD de sueldos con filtro por período
- **`src/components/personal/SueldosTab.tsx`**: Componente principal con importación, KPIs y tabla
- **`src/pages/Personal.tsx`**: Agregar pestaña "Sueldos" dentro de la sección Liquidaciones (o como sub-tab junto a la generación de planilla bancaria existente)

### Detalle técnico

La pestaña de Liquidaciones actualmente tiene el generador de planilla bancaria. La nueva funcionalidad de Sueldos se agrega como una sección separada arriba o como sub-tabs dentro de Liquidaciones: **Sueldos | Planilla Bancaria**.
