

# Sección Servicio con Sub Categorías (estilo Cotizaciones)

## Objetivo

Transformar la grilla plana de servicio en una estructura agrupada por sub categorías editables, similar al sistema de rubros de Cotizaciones. El usuario podrá crear grupos con nombre libre (ej: "Alquiler de maquinas - Semana 1") y agregar conceptos dentro de cada grupo.

## Diseño

```text
┌─────────────────────────────────────────────────┐
│ [+ Agregar Sub Categoría]                       │
├─────────────────────────────────────────────────┤
│ ▼ 1. Alquiler de maquinas - Semana 1    [🗑️]   │
│ ┌───────────┬────┬─────┬────────┬──────────┐    │
│ │Descripción│Uni.│Cant.│P.Unit. │ Subtotal │    │
│ │[Combobox ]│ HR │  8  │ 5000   │  $40.000 │    │
│ │[Combobox ]│ HR │  4  │ 3000   │  $12.000 │    │
│ │              [+ Agregar concepto]         │    │
│ └──────────────────────────────────────────┘    │
│                          Subtotal: $52.000      │
│                                                 │
│ ▼ 2. Alquiler de maquinas - Semana 2    [🗑️]   │
│ ...                                             │
├─────────────────────────────────────────────────┤
│                        Total Servicio: $104.000 │
└─────────────────────────────────────────────────┘
```

## Cambios

### 1. `CertificadoServiceGrid.tsx` — Reestructurar con grupos colapsables

Reemplazar la tabla plana por un sistema de grupos usando `Collapsible`:

- **Estado nuevo**: lista de sub categorías `{ nombre: string, open: boolean }[]`
- Cada item tendrá un campo `grupo_index` (number) para asociarlo a su sub categoría
- **Botón "Agregar Sub Categoría"**: crea un grupo nuevo con nombre editable
- **Dentro de cada grupo**: tabla con las columnas actuales (Descripción con Combobox, Unidad, Cantidad, P. Unitario, Subtotal) + botón "Agregar concepto"
- Se eliminan las columnas de Categoría y Sub Categoría del nivel de item (ya que la agrupación se hace a nivel de grupo)
- **Totales**: subtotal por grupo + total general

### 2. Modelo de datos

Los items seguirán siendo una lista plana de `CertificadoItemForm[]` — se usa el campo `etapa` para almacenar el nombre del grupo/sub categoría. Así se mantiene compatibilidad con el guardado y la vista de detalle existente sin cambios en la base de datos.

Al agregar un concepto dentro de un grupo, se setea `item.etapa = grupoNombre` automáticamente.

### 3. `Certificados.tsx` — Sin cambios estructurales

El componente padre sigue pasando y recibiendo `CertificadoItemForm[]`. La agrupación es interna al grid.

### Archivos a modificar
1. `src/components/certificados/CertificadoServiceGrid.tsx` — reestructurar con sub categorías colapsables

