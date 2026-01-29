

# Plan: Formularios Diferenciados por Rol en Parte Diario

## Resumen

Crear formularios de carga específicos para cada tipo de empleado en el Parte Diario, agregando nuevos campos a la base de datos y ajustando la interfaz según el rol del usuario.

## Estructura de Formularios por Rol

### Capataz
| Campo | Tipo |
|-------|------|
| Fecha | Automático |
| Obra | Selector |
| Rol | Automático |
| Entrada | Hora |
| Salida | Hora |
| Novedades | Texto largo (trabajo realizado) |
| Ausencias | Multi-selector de empleados (conectado a BD) |
| Observaciones/Inconvenientes | Texto largo |

### Mecánico y Ayudante
| Campo | Tipo |
|-------|------|
| Fecha | Automático |
| Obra | Selector |
| Rol | Automático |
| Entrada | Hora |
| Salida | Hora |
| Tareas | Texto largo |
| Observaciones/Inconvenientes | Texto largo |

### Maquinista (existente + nuevo campo)
- Campos actuales: Fecha, Obra, Máquina, Horarios, Horómetro, Combustible, Estado Máquina, Checklist
- **Nuevo**: Observaciones/Inconvenientes

### Chofer (existente + nuevo campo)
- Campos actuales: Fecha, Camión, Horarios, Viajes, Mov. Interno, Combustible, Estado Camión, Checklist
- **Nuevo**: Observaciones/Inconvenientes

### Sereno y Topógrafo
- Campos: Fecha, Obra, Horarios
- **Nuevo**: Observaciones/Inconvenientes

---

## Cambios en Base de Datos

### Nuevas columnas en `partes_diarios`

```sql
ALTER TABLE public.partes_diarios
ADD COLUMN novedades TEXT,
ADD COLUMN ausencias UUID[] DEFAULT '{}',
ADD COLUMN tareas TEXT,
ADD COLUMN observaciones_inconvenientes TEXT;
```

- `novedades`: Texto libre para que el Capataz describa el trabajo realizado en la obra
- `ausencias`: Array de UUIDs que referencia IDs de empleados que faltaron
- `tareas`: Texto libre para Mecánico/Ayudante describir sus tareas del día
- `observaciones_inconvenientes`: Texto libre para todos los roles justificar baja producción o reportar problemas

---

## Archivos a Modificar

### 1. src/hooks/useParteDiario.ts

**Actualizar interfaces:**
```typescript
export interface ParteDiario {
  // ... campos existentes ...
  novedades: string | null;
  ausencias: string[] | null;
  tareas: string | null;
  observaciones_inconvenientes: string | null;
}

export interface ParteDiarioInsert {
  // ... campos existentes ...
  novedades?: string | null;
  ausencias?: string[] | null;
  tareas?: string | null;
  observaciones_inconvenientes?: string | null;
}
```

---

### 2. src/components/parte-diario/ParteDiarioFormView.tsx

**Cambios principales:**

1. **Agregar nuevos estados al formData:**
```typescript
const [formData, setFormData] = useState({
  // ... campos existentes ...
  novedades: '',
  ausencias: [] as string[],
  tareas: '',
  observaciones_inconvenientes: '',
});
```

2. **Agregar prop para lista de personal:**
```typescript
interface ParteDiarioFormViewProps {
  // ... props existentes ...
  personal: Array<{ id: string; nombre: string | null; apellido: string | null; legajo: string | null }>;
}
```

3. **Definir visibilidad de campos por rol:**
```typescript
// Formulario Capataz: Obra, Horarios, Novedades, Ausencias, Observaciones
const isCapataz = rol === 'capataz';

// Formulario Mecánico/Ayudante: Obra, Horarios, Tareas, Observaciones
const isMecanicoAyudante = rol === 'mecanico' || rol === 'ayudante';

// Todos los demás: Sus campos actuales + Observaciones/Inconvenientes
const showObservacionesInconvenientes = true; // Para TODOS
```

4. **Nuevos componentes de UI:**

**Sección Novedades (solo Capataz):**
```tsx
{isCapataz && (
  <Card>
    <CardContent className="pt-4">
      <Label>📝 Novedades</Label>
      <Textarea
        placeholder="Describa el trabajo realizado en la obra..."
        value={formData.novedades}
        onChange={(e) => handleChange('novedades', e.target.value)}
      />
    </CardContent>
  </Card>
)}
```

**Sección Ausencias (solo Capataz):**
```tsx
{isCapataz && (
  <Card>
    <CardContent className="pt-4">
      <Label>👥 Ausencias</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Seleccione los empleados que faltaron hoy
      </p>
      {/* Multi-selector con checkboxes de empleados */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {personal.filter(p => p.id !== empleadoId).map(emp => (
          <Label key={emp.id} className="flex items-center gap-2 p-2 border rounded">
            <Checkbox
              checked={formData.ausencias.includes(emp.id)}
              onCheckedChange={(checked) => toggleAusencia(emp.id, checked)}
            />
            <span>{emp.apellido}, {emp.nombre}</span>
          </Label>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

**Sección Tareas (solo Mecánico y Ayudante):**
```tsx
{isMecanicoAyudante && (
  <Card>
    <CardContent className="pt-4">
      <Label>🔧 Tareas</Label>
      <Textarea
        placeholder="Describa las tareas realizadas..."
        value={formData.tareas}
        onChange={(e) => handleChange('tareas', e.target.value)}
      />
    </CardContent>
  </Card>
)}
```

**Sección Observaciones/Inconvenientes (TODOS):**
```tsx
<Card>
  <CardContent className="pt-4">
    <Label>⚠️ Observaciones / Inconvenientes</Label>
    <Textarea
      placeholder="Registre cualquier observación o inconveniente del día..."
      value={formData.observaciones_inconvenientes}
      onChange={(e) => handleChange('observaciones_inconvenientes', e.target.value)}
    />
  </CardContent>
</Card>
```

5. **Modificar lógica de visibilidad:**
- Capataz NO verá: Máquina, Horómetro, Combustible, Viajes, Estado Máquina, Checklist
- Mecánico/Ayudante NO verán: Máquina, Horómetro, Combustible, Viajes, Estado Máquina, Checklist
- Sereno/Topógrafo NO verán: Máquina, Horómetro, Combustible, Viajes, Estado Máquina, Checklist

6. **Actualizar función buildParteData():**
```typescript
const buildParteData = (): ParteDiarioInsert => {
  return {
    // ... campos existentes ...
    novedades: isCapataz ? formData.novedades || null : null,
    ausencias: isCapataz ? formData.ausencias : null,
    tareas: isMecanicoAyudante ? formData.tareas || null : null,
    observaciones_inconvenientes: formData.observaciones_inconvenientes || null,
  };
};
```

---

### 3. src/pages/ParteDiario.tsx

**Agregar hook usePersonal:**
```typescript
import { usePersonal } from "@/hooks/usePersonal";

// En el componente:
const { personal } = usePersonal();
```

**Pasar personal al formulario:**
```tsx
<ParteDiarioFormView
  // ... props existentes ...
  personal={personal}
/>
```

---

## Resumen Visual de Campos por Rol

```text
┌─────────────────┬───────────────────────────────────────────────────────────────┐
│ ROL             │ CAMPOS VISIBLES                                               │
├─────────────────┼───────────────────────────────────────────────────────────────┤
│ Capataz         │ Fecha, Obra, Horarios, Novedades, Ausencias, Observaciones    │
├─────────────────┼───────────────────────────────────────────────────────────────┤
│ Mecánico        │ Fecha, Obra, Horarios, Tareas, Observaciones                  │
├─────────────────┼───────────────────────────────────────────────────────────────┤
│ Ayudante        │ Fecha, Obra, Horarios, Tareas, Observaciones                  │
├─────────────────┼───────────────────────────────────────────────────────────────┤
│ Maquinista      │ Fecha, Obra, Máquina, Horarios, Horómetro, Combustible,       │
│                 │ Estado, Checklist, Observaciones                              │
├─────────────────┼───────────────────────────────────────────────────────────────┤
│ Chofer          │ Fecha, Camión, Horarios, Viajes, Mov. Interno, Combustible,   │
│                 │ Estado, Checklist, Observaciones                              │
├─────────────────┼───────────────────────────────────────────────────────────────┤
│ Sereno          │ Fecha, Obra, Horarios, Observaciones                          │
├─────────────────┼───────────────────────────────────────────────────────────────┤
│ Topógrafo       │ Fecha, Obra, Horarios, Observaciones                          │
└─────────────────┴───────────────────────────────────────────────────────────────┘
```

---

## Orden de Implementación

1. **Migración DB**: Agregar las 4 nuevas columnas
2. **Hook**: Actualizar interfaces en `useParteDiario.ts`
3. **Página**: Agregar `usePersonal` en `ParteDiario.tsx`
4. **Formulario**: Implementar campos diferenciados en `ParteDiarioFormView.tsx`

