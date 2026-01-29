
# Plan: Campo Patente Dinámico en Remitos

## Problema Identificado

La columna `maquinaria_id` en la base de datos es de tipo **UUID**, por lo que no puede almacenar texto libre (patentes de terceros). El código actual intenta guardar texto en esta columna cuando se selecciona un transporte que no es "Calamina Sur", lo cual causa errores.

## Solución

Agregar una nueva columna `patente_tercero` de tipo texto para almacenar las patentes de vehículos de terceros.

---

## Cambios en Base de Datos

### Nueva Columna

```sql
ALTER TABLE remitos 
ADD COLUMN patente_tercero TEXT DEFAULT NULL;
```

---

## Cambios en Código

### 1. src/hooks/useRemitos.ts

Agregar el nuevo campo a las interfaces:

```typescript
export interface RemitoDB {
  // ... campos existentes ...
  patente_tercero: string | null;  // NUEVO
}

export interface RemitoForm {
  // ... campos existentes ...
  patente_tercero?: string;  // NUEVO
}
```

### 2. src/components/remitos/RemitosDataGrid.tsx

**Actualizar GridRow:**
```typescript
interface GridRow {
  // ... campos existentes ...
  maquinaria_id: string;      // UUID para Calamina Sur
  patente_tercero: string;    // Texto para terceros
}
```

**Actualizar initialData (línea ~134):**
```typescript
maquinaria_id: r.maquinaria_id || "",
patente_tercero: r.patente_tercero || "",  // NUEVO
```

**Modificar columna Patente (líneas 407-460):**
```typescript
{
  ...keyColumn("patente", {
    component: ({ rowData, setRowData, focus }) => {
      const isCalaminaSur = rowData.tipo_transporte === "Calamina Sur";
      
      if (isCalaminaSur) {
        // Selector de maquinarias de la base de datos
        return (
          <GridSelectCell
            value={rowData.maquinaria_id}
            onChange={(v) => setRowData({ 
              ...rowData, 
              maquinaria_id: v,
              patente_tercero: ""  // Limpiar campo tercero
            })}
            options={maquinariaOptions}
            placeholder="Buscar patente..."
            focus={focus}
          />
        );
      }
      
      // Campo de texto libre para terceros
      return (
        <input
          type="text"
          value={rowData.patente_tercero || ""}
          onChange={(e) => setRowData({ 
            ...rowData, 
            patente_tercero: e.target.value,
            maquinaria_id: ""  // Limpiar campo maquinaria
          })}
          placeholder="Ej: ABC 123"
          autoFocus={focus}
          className="w-full h-full px-2 py-1 bg-transparent ..."
        />
      );
    },
    // ... resto de handlers
  }),
  title: "Patente",
  minWidth: 120,
}
```

**Actualizar handleSave (líneas 571-634):**
```typescript
// En created:
maquinaria_id: row.tipo_transporte === "Calamina Sur" 
  ? (row.maquinaria_id || null) 
  : null,
patente_tercero: row.tipo_transporte !== "Calamina Sur" 
  ? (row.patente_tercero || null) 
  : null,

// En updated:
maquinaria_id: row.tipo_transporte === "Calamina Sur" 
  ? (row.maquinaria_id || null) 
  : null,
patente_tercero: row.tipo_transporte !== "Calamina Sur" 
  ? (row.patente_tercero || null) 
  : null,
```

**Actualizar visualización de datos:**

Cuando se carga un remito existente, mostrar la patente correcta:
```typescript
// En initialData
const displayPatente = r.maquinaria?.patente || r.patente_tercero || "";
```

---

## Flujo de Datos

```text
┌─────────────────────────────────────────────────────────────────────┐
│                   TIPO TRANSPORTE                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "Calamina Sur"               │  Otros (Geo, Diaz, etc.)           │
│  ─────────────────            │  ─────────────────────────          │
│  ↓                            │  ↓                                  │
│  GridSelectCell               │  Input texto libre                  │
│  (busca en maquinarias)       │  (escribe patente)                 │
│  ↓                            │  ↓                                  │
│  Guarda: maquinaria_id=UUID   │  Guarda: patente_tercero="ABC123"  │
│          patente_tercero=null │          maquinaria_id=null        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

1. **Base de datos** - Agregar columna `patente_tercero`
2. **src/hooks/useRemitos.ts** - Agregar campo a interfaces
3. **src/components/remitos/RemitosDataGrid.tsx** - Lógica de campo dinámico
4. **src/integrations/supabase/types.ts** - Se actualiza automáticamente

---

## Beneficios

- Cada tipo de patente se almacena en su columna correcta
- UUID para referencias a maquinarias propias
- Texto libre para patentes de terceros
- Sin errores de tipo de dato
- Búsqueda funciona correctamente para ambos casos
