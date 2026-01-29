

# Plan: Gráficos de Rendimiento y PDF Adaptado por Rol

## Objetivo

Agregar a la vista administrativa de Partes Diarios:
1. Gráficos de rendimiento mensual por empleado
2. Descarga de reporte PDF adaptado según el rol del empleado

## Estructura del PDF por Rol

El PDF mostrará únicamente los campos relevantes según el rol del empleado:

| Rol | Secciones en el PDF |
|-----|---------------------|
| **Maquinista** | Horómetro (inicio/fin/horas), Estado máquina, Checklist (Filtro aire, Aceite motor, Aceite hidráulico, Líquido refrigerante), Combustible |
| **Chofer** | Viajes, Movimiento interno, Checklist (Aceite motor, Líquido refrigerante, Uría), Combustible |
| **Capataz/Mecánico** | Horarios y asignación de equipo (versión simplificada) |
| **Otros roles** | Horarios básicos |

## Arquitectura de Componentes

```text
ParteDiarioAdminView.tsx (modificar)
├── Tabs: "Listado" | "Rendimiento"
│
├── Tab Listado (actual)
│   └── Tabla con todos los partes + filtros
│
└── Tab Rendimiento (nuevo)
    ├── Selector de empleado y mes
    ├── KPIs del empleado (adaptados al rol)
    ├── Gráficos de rendimiento
    └── Botón "Descargar PDF"
```

## Archivos a Crear

### 1. `src/hooks/useParteDiarioRendimiento.ts`

Hook para calcular métricas agregadas por mes:

- Recibe: `empleadoId`, `mes`, `año`
- Retorna datos agregados por día del mes
- Incluye rol del empleado para filtrar métricas relevantes

```typescript
interface RendimientoData {
  empleado: {
    nombre: string;
    apellido: string;
    rol: RolPersonal;
    legajo: string;
  };
  diasDelMes: {
    dia: number;
    fecha: string;
    tieneParte: boolean;
    horasTrabajadas: number;
    horasMaquina: number;     // Solo maquinistas
    viajes: number;            // Solo choferes
    movimientoInterno: number; // Solo choferes
    combustible: number;
  }[];
  totales: {
    partesCompletados: number;
    partesBorrador: number;
    diasTrabajados: number;
    horasMaquinaTotales: number;
    viajesTotales: number;
    combustibleTotal: number;
    checklistCumplimiento: number; // Porcentaje
  };
}
```

### 2. `src/components/parte-diario/ParteDiarioRendimientoChart.tsx`

Componente de gráficos adaptado al rol:

**Para Maquinistas:**
- Gráfico de barras: Horas de máquina por día (horómetro)
- Gráfico de área: Combustible acumulado
- KPIs: Horas totales, Combustible, Checklist %

**Para Choferes:**
- Gráfico de barras: Viajes por día
- Gráfico secundario: Movimiento interno
- KPIs: Total viajes, Mov. interno, Combustible

**Para otros roles:**
- Gráfico de asistencia (días trabajados)
- KPIs: Días trabajados, Horas totales

### 3. `src/utils/generateParteDiarioPDF.ts`

Función que genera PDF adaptado al rol:

```typescript
export async function generateParteDiarioPDF(
  empleado: EmpleadoData,
  partes: ParteDiario[],
  totales: TotalesData,
  mes: number,
  anio: number
): Promise<void>
```

**Lógica de adaptación:**
- Detecta el rol del empleado
- Selecciona columnas de tabla según rol
- Muestra secciones de resumen relevantes
- Filtra ítems de checklist por rol

## Estructura del PDF (ejemplo Maquinista)

```text
+------------------------------------------+
| [LOGO]            CALAMINA SUR S.A.      |
|          CUIT: 30-71457642-5             |
+------------------------------------------+
| REPORTE DE PARTES DIARIOS                |
| Fecha: 29/01/2026                        |
+------------------------------------------+
| EMPLEADO                                 |
| Nombre: Juan Pérez                       |
| Rol: Maquinista | Legajo: 001            |
+------------------------------------------+
| PERÍODO: Enero 2026                      |
+------------------------------------------+
| RESUMEN (campos de maquinista)           |
| Partes completados: 22                   |
| Horas de máquina: 176 hrs                |
| Combustible: 350 L                       |
| Checklist cumplido: 95%                  |
| Días trabajados: 22/31                   |
+------------------------------------------+
| DETALLE DE PARTES                        |
| Fecha | Obra | Horario | Horometro | Est |
| 02/01 | ObraA| 08-17   | 100→108   | OK  |
| ...                                      |
+------------------------------------------+
| Generado el 29/01/2026 10:30            |
+------------------------------------------+
```

## Estructura del PDF (ejemplo Chofer)

```text
+------------------------------------------+
| [LOGO]            CALAMINA SUR S.A.      |
+------------------------------------------+
| REPORTE DE PARTES DIARIOS                |
+------------------------------------------+
| EMPLEADO                                 |
| Nombre: Pedro García                     |
| Rol: Chofer | Legajo: 015                |
+------------------------------------------+
| PERÍODO: Enero 2026                      |
+------------------------------------------+
| RESUMEN (campos de chofer)               |
| Partes completados: 20                   |
| Total viajes: 145                        |
| Movimiento interno: 23                   |
| Combustible: 520 L                       |
| Días trabajados: 20/31                   |
+------------------------------------------+
| DETALLE DE PARTES                        |
| Fecha | Camión  | Viajes | Mov.Int | Est |
| 02/01 | CAM-001 | 8      | 2       | OK  |
| ...                                      |
+------------------------------------------+
```

## Modificaciones a Archivos Existentes

### `src/components/parte-diario/ParteDiarioAdminView.tsx`

Cambios:
- Agregar sistema de Tabs ("Listado" / "Rendimiento")
- Integrar selector de empleado y mes
- Mostrar gráficos de rendimiento
- Agregar botón "Descargar PDF"

## Flujo de Usuario

```text
Admin entra a /parte-diario
         ↓
Ve tabs: [Listado] [Rendimiento]
         ↓
Click en "Rendimiento"
         ↓
Selecciona empleado (ej: Juan - Maquinista)
         ↓
Ve gráficos adaptados a maquinista:
  - Horas de horómetro por día
  - Combustible consumido
  - % checklist cumplido
         ↓
Click "Descargar PDF"
         ↓
PDF generado con columnas de maquinista:
  - Horómetro inicio/fin
  - Estado máquina
  - Checklist específico
```

## Resumen de Archivos

**Crear:**
| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useParteDiarioRendimiento.ts` | Hook para datos de rendimiento |
| `src/components/parte-diario/ParteDiarioRendimientoChart.tsx` | Gráficos adaptados al rol |
| `src/utils/generateParteDiarioPDF.ts` | Generador de PDF adaptado al rol |

**Modificar:**
| Archivo | Cambio |
|---------|--------|
| `src/components/parte-diario/ParteDiarioAdminView.tsx` | Agregar tabs, selector y botón PDF |

## Mapeo de Campos por Rol en PDF

### Columnas de tabla

| Columna | Maquinista | Chofer | Otros |
|---------|:----------:|:------:|:-----:|
| Fecha | ✓ | ✓ | ✓ |
| Obra | ✓ | - | - |
| Máquina/Camión | ✓ | ✓ | - |
| Horario | ✓ | ✓ | ✓ |
| Horómetro | ✓ | - | - |
| Viajes | - | ✓ | - |
| Mov. Interno | - | ✓ | - |
| Combustible | ✓ | ✓ | - |
| Estado | ✓ | ✓ | - |

### Items de checklist

| Item | Maquinista | Chofer |
|------|:----------:|:------:|
| Filtro de aire | ✓ | - |
| Aceite motor | ✓ | ✓ |
| Aceite hidráulico | ✓ | - |
| Líquido refrigerante | ✓ | ✓ |
| Uría | - | ✓ |

## Tecnologías Utilizadas

- **Recharts**: Gráficos (ya instalado en el proyecto)
- **jsPDF + jspdf-autotable**: Generación de PDF (ya instalado)
- **date-fns**: Manejo de fechas (ya instalado)

## Pruebas Recomendadas

1. Seleccionar un maquinista y verificar que los gráficos muestran horómetro
2. Seleccionar un chofer y verificar que los gráficos muestran viajes
3. Descargar PDF de maquinista y verificar columnas correctas
4. Descargar PDF de chofer y verificar columnas correctas
5. Cambiar de mes y verificar actualización de datos
6. Verificar formato de fechas dd/mm/yyyy en todo el PDF

