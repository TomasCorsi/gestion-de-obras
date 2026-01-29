
# Plan: Incluir Nuevos Campos en PDF, Exportación y Modal de Detalle

## Resumen

Actualizar tres componentes clave para mostrar y exportar los nuevos campos de partes diarios: novedades, ausencias, tareas y observaciones/inconvenientes.

---

## Archivos a Modificar

### 1. src/components/parte-diario/ParteDiarioDetailDialog.tsx

El modal de detalle actualmente no muestra los nuevos campos. Agregaremos secciones condicionales según el rol del empleado.

**Cambios:**

1. **Importar icono adicional:**
```typescript
import { Users, Wrench, AlertTriangle } from "lucide-react";
```

2. **Agregar prop para lista de personal** (para resolver nombres de ausencias):
```typescript
interface ParteDiarioDetailDialogProps {
  parte: ParteDiario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showEmpleado?: boolean;
  personalList?: Array<{ id: string; nombre: string | null; apellido: string | null }>;
}
```

3. **Función para obtener nombres de empleados ausentes:**
```typescript
const getAusenciasNombres = () => {
  if (!parte.ausencias || parte.ausencias.length === 0 || !personalList) return [];
  return parte.ausencias.map(id => {
    const emp = personalList.find(p => p.id === id);
    return emp ? `${emp.apellido}, ${emp.nombre}` : id;
  });
};
```

4. **Nueva sección Novedades (para Capataz):**
```tsx
{parte.novedades && (
  <DetailSection title="Novedades del Día">
    <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-sm whitespace-pre-wrap">{parte.novedades}</p>
    </div>
  </DetailSection>
)}
```

5. **Nueva sección Ausencias (para Capataz):**
```tsx
{parte.ausencias && parte.ausencias.length > 0 && (
  <DetailSection title="Ausencias Registradas">
    <div className="flex flex-wrap gap-2">
      {getAusenciasNombres().map((nombre, idx) => (
        <Badge key={idx} variant="secondary" className="bg-amber-500/10 text-amber-600">
          <Users className="w-3 h-3 mr-1" />
          {nombre}
        </Badge>
      ))}
    </div>
  </DetailSection>
)}
```

6. **Nueva sección Tareas (para Mecánico/Ayudante):**
```tsx
{parte.tareas && (
  <DetailSection title="Tareas Realizadas">
    <div className="p-3 bg-muted/50 rounded-lg">
      <p className="text-sm whitespace-pre-wrap">{parte.tareas}</p>
    </div>
  </DetailSection>
)}
```

7. **Nueva sección Observaciones/Inconvenientes (para TODOS):**
```tsx
{parte.observaciones_inconvenientes && (
  <DetailSection title="Observaciones / Inconvenientes">
    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
        <p className="text-sm whitespace-pre-wrap">{parte.observaciones_inconvenientes}</p>
      </div>
    </div>
  </DetailSection>
)}
```

---

### 2. src/components/parte-diario/ParteDiarioAdminView.tsx

Actualizar para pasar la lista de personal al diálogo de detalle.

**Cambio:**
```tsx
<ParteDiarioDetailDialog
  parte={selectedParte}
  open={!!selectedParte}
  onOpenChange={(open) => !open && setSelectedParte(null)}
  showEmpleado
  personalList={personal}
/>
```

---

### 3. src/utils/generateParteDiarioPDF.ts

Actualizar el PDF para incluir los nuevos campos específicos por rol.

**Cambios:**

1. **Agregar parámetro opcional de lista de personal:**
```typescript
export async function generateParteDiarioPDF(
  empleado: EmpleadoRendimiento,
  partes: ParteDiario[],
  totales: TotalesRendimiento,
  mes: number,
  anio: number,
  personalList?: Array<{ id: string; nombre: string | null; apellido: string | null }>
): Promise<void>
```

2. **Actualizar columnas de tabla para Capataz:**
```typescript
case 'capataz':
  return {
    header: ["Fecha", "Obra", "Horario", "Ausencias", "Obs."],
    keys: ["fecha", "obra", "horario", "ausencias", "observaciones"],
  };
```

3. **Actualizar columnas de tabla para Mecánico/Ayudante:**
```typescript
case 'mecanico':
case 'ayudante':
  return {
    header: ["Fecha", "Obra", "Horario", "Tareas", "Obs."],
    keys: ["fecha", "obra", "horario", "tareas", "observaciones"],
  };
```

4. **Actualizar getRowDataForRole para nuevos campos:**
```typescript
case 'capataz':
  const ausenciasCount = parte.ausencias?.length || 0;
  const tieneObs = parte.observaciones_inconvenientes ? 'Sí' : '-';
  return [fecha, obraName, horario, `${ausenciasCount} emp.`, tieneObs];
case 'mecanico':
case 'ayudante':
  const tareaResumen = parte.tareas ? 
    (parte.tareas.length > 20 ? parte.tareas.slice(0,20)+'...' : parte.tareas) : '-';
  const tieneObsMA = parte.observaciones_inconvenientes ? 'Sí' : '-';
  return [fecha, obraName, horario, tareaResumen, tieneObsMA];
```

5. **Nueva sección de Novedades en el PDF (después de la tabla, solo para Capataz):**
```typescript
if (rol === 'capataz') {
  const partesConNovedades = partes.filter(p => p.novedades);
  if (partesConNovedades.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NOVEDADES REGISTRADAS", margin, yPos);
    yPos += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    partesConNovedades.forEach(p => {
      const fechaStr = format(new Date(p.fecha), "dd/MM");
      doc.text(`${fechaStr}: ${p.novedades?.slice(0, 100) || ''}...`, margin + 2, yPos);
      yPos += 3;
    });
    yPos += 3;
  }
}
```

6. **Nueva sección de Observaciones/Inconvenientes (para TODOS):**
```typescript
const partesConObservaciones = partes.filter(p => p.observaciones_inconvenientes);
if (partesConObservaciones.length > 0) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVACIONES / INCONVENIENTES", margin, yPos);
  yPos += 4;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  partesConObservaciones.forEach(p => {
    const fechaStr = format(new Date(p.fecha), "dd/MM");
    doc.text(`${fechaStr}: ${p.observaciones_inconvenientes?.slice(0, 80) || ''}`, margin + 2, yPos);
    yPos += 3;
  });
  yPos += 3;
}
```

---

### 4. src/components/parte-diario/ParteDiarioRendimientoTab.tsx

Pasar la lista de personal al generador de PDF.

**Cambio en handleDownloadPDF:**
```typescript
const handleDownloadPDF = async () => {
  if (!data.empleado || data.partes.length === 0) return;

  setIsGeneratingPDF(true);
  try {
    await generateParteDiarioPDF(
      data.empleado,
      data.partes,
      data.totales,
      selectedMes,
      selectedAnio,
      personal // Agregar lista de personal
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    setIsGeneratingPDF(false);
  }
};
```

---

## Resumen Visual de Cambios

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MODAL DE DETALLE (DetailDialog)                  │
├─────────────────────────────────────────────────────────────────────┤
│  + Sección "Novedades del Día"       (solo Capataz)                │
│  + Sección "Ausencias Registradas"   (solo Capataz, con nombres)   │
│  + Sección "Tareas Realizadas"       (solo Mecánico/Ayudante)      │
│  + Sección "Observaciones/Inconvenientes" (TODOS los roles)        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    PDF EXPORTADO                                     │
├─────────────────────────────────────────────────────────────────────┤
│  TABLA ACTUALIZADA:                                                  │
│    - Capataz: Fecha, Obra, Horario, Ausencias, Obs                  │
│    - Mecánico/Ayudante: Fecha, Obra, Horario, Tareas, Obs           │
│                                                                      │
│  NUEVAS SECCIONES:                                                   │
│    + "NOVEDADES REGISTRADAS" (solo Capataz)                         │
│    + "OBSERVACIONES / INCONVENIENTES" (todos los roles)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Orden de Implementación

1. **ParteDiarioDetailDialog.tsx** - Agregar secciones para nuevos campos
2. **ParteDiarioAdminView.tsx** - Pasar personalList al diálogo
3. **generateParteDiarioPDF.ts** - Actualizar columnas y agregar secciones
4. **ParteDiarioRendimientoTab.tsx** - Pasar personal a la función PDF
