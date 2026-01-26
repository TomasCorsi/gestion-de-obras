
# Plan: Reestructuracion del Modulo de Remitos

## Objetivo
Modificar completamente la seccion de Remitos para incluir las siguientes columnas:
- REMITO TERCERO (numero de remito del proveedor externo)
- REMITO LOCAL (numero de remito interno)
- FECHA
- DESDE (origen)
- HASTA (destino)
- CANTIDAD DE VIAJES
- UNIDAD (TN, KG, M3, M2, U)
- CANTIDAD
- TIPO (material: Residuos, Desmonte, Cascote, Escombro, Tierra, Piedra, Movimiento interno, Tosca, Cemento, Hormigon, Traslado, Cubiertas, Frezado)
- PRECIO TOTAL
- TIPO TRANSPORTE (empresa: Calamina Sur, Geo hermanos, Diaz Neiva, japones, Cato, Tatu, Patan)
- PATENTE (conectado con maquinarias)

## Cambios en Base de Datos

### Migracion SQL
Se agregaran las siguientes columnas a la tabla `remitos`:

```sql
ALTER TABLE remitos
  ADD COLUMN IF NOT EXISTS remito_tercero text,
  ADD COLUMN IF NOT EXISTS remito_local text,
  ADD COLUMN IF NOT EXISTS desde text,
  ADD COLUMN IF NOT EXISTS hasta text,
  ADD COLUMN IF NOT EXISTS cantidad_viajes integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tipo_material text,
  ADD COLUMN IF NOT EXISTS precio_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_transporte text,
  ADD COLUMN IF NOT EXISTS maquinaria_id uuid REFERENCES maquinarias(id);
```

### Mapeo de Columnas Existentes vs Nuevas

| Actual | Nueva Estructura |
|--------|------------------|
| numero | remito_local (renombrado conceptualmente) |
| - | remito_tercero (NUEVO) |
| fecha | fecha (sin cambios) |
| - | desde (NUEVO) |
| - | hasta (NUEVO) |
| - | cantidad_viajes (NUEVO) |
| unidad | unidad (ampliado con TN, KG, M3, M2, U) |
| cantidad | cantidad (sin cambios) |
| material | tipo_material (renombrado, con opciones fijas) |
| - | precio_total (NUEVO) |
| - | tipo_transporte (NUEVO) |
| - | maquinaria_id (NUEVO, FK a maquinarias) |
| obra_id | Se mantiene para filtros |
| recibido_por | Se puede mantener u omitir |
| firmado | Se puede mantener u omitir |

## Cambios en Codigo

### 1. Hook `useRemitos.ts`

Actualizar interfaces y queries:

```typescript
export interface RemitoDB {
  id: string;
  remito_tercero: string | null;
  remito_local: string | null;
  fecha: string;
  desde: string | null;
  hasta: string | null;
  cantidad_viajes: number;
  unidad: string;
  cantidad: number;
  tipo_material: string | null;
  precio_total: number;
  tipo_transporte: string | null;
  maquinaria_id: string | null;
  obra_id: string;
  // campos legacy
  numero: string;
  firmado: boolean;
  observaciones: string | null;
  // ...
}

export interface RemitoWithRelations extends RemitoDB {
  maquinaria?: { codigo: string; patente: string | null };
  obra?: { nombre: string };
}
```

Actualizar el query para incluir la relacion con maquinarias:
```typescript
.select(`
  *,
  obra:obras(nombre),
  maquinaria:maquinarias(codigo, patente)
`)
```

### 2. Componente `RemitosDataGrid.tsx`

Redefinir columnas del grid:

```typescript
interface GridRow {
  id?: string;
  remito_tercero: string;
  remito_local: string;
  fecha: string;
  desde: string;
  hasta: string;
  cantidad_viajes: number | null;
  unidad: string;
  cantidad: number | null;
  tipo_material: string;
  precio_total: number | null;
  tipo_transporte: string;
  maquinaria_id: string;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}
```

Nuevas columnas:
```typescript
const columns = [
  { ...keyColumn("remito_tercero", textColumn), title: "Remito Tercero", minWidth: 130 },
  { ...keyColumn("remito_local", textColumn), title: "Remito Local", minWidth: 130 },
  { ...keyColumn("fecha", textColumn), title: "Fecha", minWidth: 100 },
  { ...keyColumn("desde", textColumn), title: "Desde", minWidth: 120 },
  { ...keyColumn("hasta", textColumn), title: "Hasta", minWidth: 120 },
  { ...keyColumn("cantidad_viajes", floatColumn), title: "Cant. Viajes", minWidth: 90 },
  { /* unidad con GridSelectCell */ },
  { ...keyColumn("cantidad", floatColumn), title: "Cantidad", minWidth: 90 },
  { /* tipo_material con GridSelectCell */ },
  { ...keyColumn("precio_total", floatColumn), title: "Precio Total", minWidth: 110 },
  { /* tipo_transporte con GridSelectCell */ },
  { /* maquinaria_id con GridSelectCell - busqueda por codigo/patente */ },
];
```

### 3. Opciones para Selectores

**Unidades:**
```typescript
const unidadOptions = [
  { value: "TN", label: "TN" },
  { value: "KG", label: "KG" },
  { value: "M3", label: "M3" },
  { value: "M2", label: "M2" },
  { value: "U", label: "U" },
];
```

**Tipos de Material:**
```typescript
const tipoMaterialOptions = [
  { value: "Residuos", label: "Residuos" },
  { value: "Desmonte", label: "Desmonte" },
  { value: "Cascote", label: "Cascote" },
  { value: "Escombro", label: "Escombro" },
  { value: "Tierra", label: "Tierra" },
  { value: "Piedra", label: "Piedra" },
  { value: "Movimiento interno", label: "Mov. interno" },
  { value: "Tosca", label: "Tosca" },
  { value: "Cemento", label: "Cemento" },
  { value: "Hormigon", label: "Hormigon" },
  { value: "Traslado", label: "Traslado" },
  { value: "Cubiertas", label: "Cubiertas" },
  { value: "Frezado", label: "Frezado" },
];
```

**Tipos de Transporte:**
```typescript
const tipoTransporteOptions = [
  { value: "Calamina Sur", label: "Calamina Sur" },
  { value: "Geo hermanos", label: "Geo hermanos" },
  { value: "Diaz Neiva", label: "Diaz Neiva" },
  { value: "japones", label: "Japonés" },
  { value: "Cato", label: "Cato" },
  { value: "Tatu", label: "Tatu" },
  { value: "Patan", label: "Patan" },
];
```

**Patentes (Maquinarias):**
Se usara el hook `useMaquinarias` y se filtraran las que tienen patente. El selector mostrara `codigo - patente` y permitira buscar por ambos campos.

### 4. Pagina `Remitos.tsx`

- Actualizar imports para incluir `useMaquinarias`
- Actualizar el formulario modal con los nuevos campos
- Actualizar la tabla de vista normal con las nuevas columnas
- Actualizar las tarjetas de estadisticas

### 5. Estructura Visual del Grid

```text
+-------------+-------------+--------+--------+--------+-------+-----+------+--------+--------+-----------+---------+
|Rem. Tercero |Rem. Local   | Fecha  | Desde  | Hasta  |Viajes |Unid |Cant  |  Tipo  | Precio |Transporte |Patente  |
+-------------+-------------+--------+--------+--------+-------+-----+------+--------+--------+-----------+---------+
| 00123       | REM-2026-01 |26/01/26| Cantera| Obra X |   3   | TN  |  45  | Tosca  | 150000 |Calamina   |ABC-123  |
| 00124       | REM-2026-02 |26/01/26| Deposito| Obra Y|   1   | M3  |  18  |Hormigon| 85000  |Geo herm.  |XYZ-456  |
+-------------+-------------+--------+--------+--------+-------+-----+------+--------+--------+-----------+---------+
```

## Archivos a Modificar

1. **Migracion SQL** - Agregar nuevas columnas a tabla `remitos`
2. `src/hooks/useRemitos.ts` - Actualizar interfaces y queries
3. `src/components/remitos/RemitosDataGrid.tsx` - Redefinir columnas del grid
4. `src/pages/Remitos.tsx` - Actualizar formularios, tabla y estadisticas

## Consideraciones de Compatibilidad

- La columna `numero` existente se puede mapear a `remito_local` 
- Los datos existentes se preservaran (campos nuevos seran null/default)
- El campo `obra_id` se mantiene para los filtros de FilterBar
- Los campos `firmado` y `recibido_por` se pueden mantener como opcionales o eliminar segun preferencia

## Dependencias

- `useMaquinarias` hook (ya existe)
- `GridSelectCell` componente (ya existe)
- `react-datasheet-grid` (ya instalado)
