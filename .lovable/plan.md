
## Renombrar "Etapa" → "Sub Categoría" y mostrar Categoría en certificados de Obra

### Qué se cambia y dónde

El término "Etapa" existe en varias capas del sistema. Se renombra visualmente a "Sub Categoría" en la UI y en el PDF, sin alterar la base de datos (la columna sigue llamándose `etapa` internamente — solo cambia lo que ve el usuario).

---

### 1. `src/pages/Certificados.tsx` — Cambios de etiquetas en la UI

**a) Tabla de Conceptos (pestaña "Conceptos")**
- Columna `<TableHead>Etapa</TableHead>` → `<TableHead>Sub Categoría</TableHead>` (línea 668)
- En el dialog "Nuevo Concepto": label `Etapa (opcional)` → `Sub Categoría (opcional)` (línea 726)
- En el dialog "Editar Concepto": label `Etapa (opcional)` → `Sub Categoría (opcional)` (línea 1467)

**b) Dialog de crear/editar certificado — sección Obra**
- Encabezado de grupo: `{group.etapa}` se mantiene (es el valor del campo), pero el texto descriptivo en el subtítulo cambia:
  - Línea 772: `"categorías" : "etapas"` → `"categorías" : "sub categorías"`
- Footer de la tabla obra: `Subtotal {group.etapa}` → `Subtotal {group.etapa}` (sin cambio de dato, solo la label de la sección de totales si hubiese texto fijo)

**c) Dialog de vista del certificado (tipo Obra)**
- Añadir una columna **"Categoría"** en la tabla de ítems de tipo Obra, mostrando la categoría de cada ítem (obtenida del `categoriaMap` — que ya existe como variable en la función para el PDF).
  - En la vista actual, los ítems de Obra están agrupados por Sub Categoría (etapa), pero no muestran Categoría en ninguna columna de la tabla.
  - Se añade columna `Categoría` entre `Concepto` y `Un.` en la tabla de vista.
  - Se construye el `categoriaMap` (igual que para el PDF) en el componente principal y se pasa a los grupos de la vista.

**d) Tab "Orden de Etapas"**
- El tab se renombra a `"Orden de Sub Categorías"` (línea 548)
- El texto explicativo dentro de `EtapasOrdenTab`: "Ordená las etapas..." → "Ordená las sub categorías..."
- La columna de la tabla: `<TableHead>Etapa</TableHead>` → `<TableHead>Sub Categoría</TableHead>`
- El texto vacío: "No hay etapas definidas. Asigná etapas..." → "No hay sub categorías definidas..."

**e) Dialog de crear/editar — tabla tipo Servicio**
- En tipo servicio, la categoría ya se ve como encabezado de grupo — no hay cambio necesario.

**f) Mostrar Categoría en la tabla de Obra del dialog crear/editar**
- En la tabla de ítems de tipo Obra (sección `draftGroupedEtapa`), añadir columna `Categoría` entre `Concepto` y `Un.` para que el usuario vea a qué categoría pertenece cada ítem mientras carga el certificado.

---

### 2. `src/utils/generateCertificadoPDF.ts` — PDF

**a) Certificados tipo Obra — función `generateObraPDF`**
- Actualmente las filas tienen 10 columnas: `Concepto | V. Unit. | Cant. Tot. | V. Total | % Ant. | % Act. | % Acum. | Av. Ant. | Av. Act. | Av. Acum.`
- Se añade columna **"Categoría"** como segunda columna (después de Concepto): `Concepto | Categoría | V. Unit. | ...`
- El encabezado del grupo cambia de `etapaName.toUpperCase()` a mostrar `"SUB CATEGORÍA: " + etapaName.toUpperCase()` para dejarlo más claro.
- Se actualiza el `colSpan` de los encabezados de grupo de 10 a 11.
- La función recibe el `categoriaMap` (ya disponible en el llamador).

**b) Certificados tipo Servicio — función `generateServicioPDF`**
- La categoría ya aparece como encabezado de grupo en el PDF — no hay cambio necesario.

---

### 3. Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/Certificados.tsx` | Renombrar "Etapa" → "Sub Categoría" en labels, tabs y columnas; añadir columna Categoría en vistas de Obra |
| `src/utils/generateCertificadoPDF.ts` | Añadir columna Categoría en PDF de Obra; actualizar label del encabezado de grupo a "Sub Categoría" |

**Sin cambios de base de datos** — todo es visual/UI, el campo interno sigue siendo `etapa`.
