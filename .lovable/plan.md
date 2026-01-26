
# Plan: Exportacion a PDF del Detalle de Gastos por Maquinaria

## Objetivo
Agregar un boton de exportacion a PDF que genere un documento profesional con todos los detalles de la maquinaria y sus gastos, optimizado para caber en una sola hoja A4.

## Analisis

Se reutilizaran los patrones existentes del generador de PDF de cotizaciones:
- Libreria `jsPDF` con `jspdf-autotable` (ya instaladas)
- Logo de la empresa (`logo-calamina-sur.png`)
- Funcion `loadImageAsBase64` para cargar imagenes
- Estilos compactos (fuentes 6-7pt, margenes 10mm)

## Estructura del PDF

```text
+----------------------------------------------------------+
|  [LOGO]                        CALAMINA SUR S.A.         |
|                                CUIT: 30-71457642-5       |
|                                Direccion, Tel, Email     |
+----------------------------------------------------------+
|  REPORTE DE GASTOS POR MAQUINARIA                        |
|  Fecha del reporte: 26/01/2026                           |
+----------------------------------------------------------+
|  DATOS DE LA MAQUINARIA                                  |
|  Codigo: 501          Nombre: Camion Volvo               |
|  Tipo: Camion         Marca: Volvo                       |
|  Patente: ABC-123     Anio: 2020                         |
|  Estado: Operativa    Horas acum.: 12,500                |
+----------------------------------------------------------+
|  Periodo: 01/01/2025 - 26/01/2026                        |
+----------------------------------------------------------+
|  RESUMEN DE GASTOS                                       |
|  Combustible:    $1,234,567  (5,432 L)                   |
|  Viajes:         45 viajes   (2,300 km - 1,500 m3)       |
|  Mantenimiento:  $456,789    (12 servicios)              |
|  -------------------------------------------------       |
|  GASTO TOTAL:    $1,691,356                              |
+----------------------------------------------------------+
|  DETALLE DE GASTOS                                       |
|  Fecha    | Tipo         | Descripcion      | Obra |Costo|
|  26/01/26 | Combustible  | 150L @ $1500/L   | Ob1  |225k |
|  25/01/26 | Mantenimiento| Cambio aceite    | -    |45k  |
|  ...                                                      |
+----------------------------------------------------------+
|                    CALAMINA SUR S.A.                     |
|              Generado el 26/01/2026 10:30                |
+----------------------------------------------------------+
```

## Cambios Tecnicos

### 1. Nuevo archivo: `src/utils/generateGastosMaquinariaPDF.ts`

Crear una utilidad dedicada para generar el PDF de gastos:

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoCalamina from "@/assets/logo-calamina-sur.png";

interface MaquinariaData {
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string;
  patente: string | null;
  anio: number;
  estado: string;
  horas_acumuladas: number;
}

interface TotalesData {
  totalCombustible: number;
  totalLitros: number;
  totalViajes: number;
  totalKm: number;
  totalVolumen: number;
  totalMantenimientos: number;
  costoMantenimientos: number;
  gastoTotal: number;
}

interface GastoDetalle {
  fecha: string;
  tipo: string;
  descripcion: string;
  obra: string;
  costo: number;
}

export async function generateGastosMaquinariaPDF(
  maquinaria: MaquinariaData,
  totales: TotalesData,
  gastos: GastoDetalle[],
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<void> {
  // Implementacion similar a generateCotizacionPDF
  // Con header, datos de maquinaria, resumen, y tabla de detalle
}
```

### 2. Modificar: `src/components/maquinarias/GastosMaquinaria.tsx`

Agregar boton de exportacion a PDF junto al de Excel:

```typescript
// Importar la nueva funcion
import { generateGastosMaquinariaPDF } from "@/utils/generateGastosMaquinariaPDF";
import { FileText } from "lucide-react"; // Icono para PDF

// Nueva funcion de exportacion
const exportarPDF = async () => {
  const maquinaria = maquinarias.find((m) => m.id === selectedMaquinariaId);
  if (!maquinaria) {
    toast.error("Selecciona una maquinaria primero");
    return;
  }

  const gastosParaPDF = gastosUnificados.map((g) => ({
    fecha: g.fecha,
    tipo: tipoGastoConfig[g.tipo].label,
    descripcion: g.descripcion,
    obra: g.obra || "-",
    costo: g.costo,
  }));

  await generateGastosMaquinariaPDF(
    {
      codigo: maquinaria.codigo,
      nombre: maquinaria.nombre,
      tipo: tiposConfig[maquinaria.tipo],
      marca: maquinaria.marca,
      patente: maquinaria.patente,
      anio: maquinaria.anio,
      estado: maquinaria.estado,
      horas_acumuladas: maquinaria.horas_acumuladas,
    },
    totales,
    gastosParaPDF,
    fechaDesde,
    fechaHasta
  );
  toast.success("PDF exportado correctamente");
};

// UI - Agregar dropdown con opciones de exportacion
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className="gap-2">
      <Download className="w-4 h-4" />
      Exportar
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={exportarExcel}>
      <Download className="w-4 h-4 mr-2" />
      Excel (.xlsx)
    </DropdownMenuItem>
    <DropdownMenuItem onClick={exportarPDF}>
      <FileText className="w-4 h-4 mr-2" />
      PDF
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Optimizaciones para Una Sola Hoja

El PDF usara las mismas tecnicas que cotizaciones:
- Margenes reducidos (10mm)
- Fuentes compactas (header 10pt, body 6-7pt)
- Tabla con cellPadding minimo (1)
- Si hay muchos registros, la tabla se ajustara con fuente mas pequena

## Dependencias

No se requieren nuevas dependencias:
- `jspdf` - Ya instalado
- `jspdf-autotable` - Ya instalado
- `date-fns` - Ya instalado

## Archivos a Crear/Modificar

1. **Crear**: `src/utils/generateGastosMaquinariaPDF.ts` - Funcion generadora del PDF
2. **Modificar**: `src/components/maquinarias/GastosMaquinaria.tsx` - Agregar boton y dropdown de exportacion
