

# Plan: Exportar Excel de Vacaciones No Pagadas con Selección

## Resumen

Agregar funcionalidad para exportar un archivo Excel con las vacaciones no pagadas, permitiendo seleccionar empleados específicos antes de la exportación.

## Flujo de Usuario

1. Usuario está en la pestaña "Solicitudes" de Vacaciones
2. Hace clic en botón "Exportar No Pagadas"
3. Se abre un diálogo con lista de vacaciones no pagadas
4. Usuario puede seleccionar/deseleccionar vacaciones individuales
5. Usuario hace clic en "Descargar Excel"
6. Se genera archivo con columnas: Legajo, Empleado, Días, Desde, Hasta

## Archivos a Modificar

### 1. src/components/personal/VacacionesTab.tsx

**Nuevos estados:**
- `exportDialogOpen`: controla visibilidad del diálogo
- `selectedForExport`: Set de IDs de vacaciones seleccionadas

**Nuevas funciones:**
- `handleOpenExportDialog()`: filtra vacaciones no pagadas y abre diálogo
- `toggleSelectForExport(id)`: selecciona/deselecciona una vacación
- `toggleSelectAll()`: selecciona/deselecciona todas
- `exportToExcel()`: genera el archivo Excel usando librería xlsx

**Nuevo componente de diálogo:**
- Tabla con checkbox por fila
- Checkbox "Seleccionar todos" en el header
- Botón para descargar

**Nuevos imports:**
- `import * as XLSX from "xlsx"` 
- `import { Download } from "lucide-react"` (icono para botón)
- `import { Checkbox } from "@/components/ui/checkbox"`

## Diseño del Diálogo

```text
┌────────────────────────────────────────────────────┐
│  Exportar Vacaciones No Pagadas              [X]  │
├────────────────────────────────────────────────────┤
│  Selecciona los empleados que quieres exportar    │
│                                                    │
│  [✓] Seleccionar todos (15 de 15)                 │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ [✓] │ Legajo │ Empleado      │ Días │ Desde  │ │
│  │ [✓] │ 58     │ ALBORNOZ, G.  │ 21   │ 02/02  │ │
│  │ [✓] │ 140    │ MERELEZ, M.   │ 14   │ 02/02  │ │
│  │ [ ] │ 170    │ TIJERATHS, N. │ 14   │ 02/02  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│              [Cancelar]  [Descargar Excel (2)]    │
└────────────────────────────────────────────────────┘
```

## Estructura del Excel Exportado

| Legajo | Empleado | Dias | Desde | Hasta |
|--------|----------|------|-------|-------|
| 58 | ALBORNOZ, GUILLERMO ADOLFO | 21 | 02/02/2026 | 22/02/2026 |
| 140 | MERELEZ, MATIAS EMANUEL | 14 | 02/02/2026 | 15/02/2026 |

## Cambios Detallados

### Nuevo botón en barra de acciones (junto a "Nueva Solicitud"):
```tsx
<Button
  variant="outline"
  onClick={handleOpenExportDialog}
  disabled={noPagadas === 0}
>
  <Download className="w-4 h-4 mr-2" />
  Exportar No Pagadas
</Button>
```

### Función de exportación Excel:
```tsx
const exportToExcel = () => {
  const vacacionesSeleccionadas = vacaciones.filter(
    v => selectedForExport.has(v.id)
  );
  
  const data = vacacionesSeleccionadas.map(v => ({
    "Legajo": v.personal?.legajo || "",
    "Empleado": `${v.personal?.apellido || ""}, ${v.personal?.nombre || ""}`,
    "Dias": v.dias_totales,
    "Desde": formatDate(v.fecha_inicio),
    "Hasta": formatDate(v.fecha_fin),
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vacaciones No Pagadas");
  
  // Auto-ajustar columnas
  ws["!cols"] = [
    { wch: 10 },  // Legajo
    { wch: 35 },  // Empleado
    { wch: 8 },   // Dias
    { wch: 12 },  // Desde
    { wch: 12 },  // Hasta
  ];
  
  XLSX.writeFile(wb, `Vacaciones_No_Pagadas_${fecha}.xlsx`);
};
```

## Tecnologías Utilizadas

- **xlsx**: librería ya instalada en el proyecto para generar archivos Excel
- **Checkbox de Radix**: componente existente en `@/components/ui/checkbox`
- **FormDialog**: componente reutilizable existente para diálogos

## Resultado Final

- Botón visible solo cuando hay vacaciones no pagadas
- Diálogo modal con tabla seleccionable
- Archivo Excel descargado con nombre `Vacaciones_No_Pagadas_YYYY-MM-DD.xlsx`
- Columnas en formato legible (fechas dd/mm/yyyy usando formatDate existente)

