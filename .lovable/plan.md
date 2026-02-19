
## Dos mejoras al módulo de Certificados

### Pedido 1: Eliminar y agregar conceptos en tipo "Obra (con acumulados)"

**Problema actual:** La tabla de tipo Obra no tiene columna de eliminación ni se conecta al botón "Agregar concepto". Solo el modo Servicio tiene el botón de eliminar por fila.

**Solución:** Tres cambios en la tabla Obra del dialog de crear/editar:
- Agregar una columna extra al final de la tabla de Obra con el botón de papelera (igual al de Servicio).
- Ajustar el `colSpan` del footer de subtotal de Obra de 11 → 12 para compensar la columna nueva.
- El botón "Agregar concepto" ya existe y funciona (`conceptosNoEnDraft`), pero solo si hay conceptos activos no en el draft. Esto ya funciona para ambos tipos automáticamente.

**Cambios técnicos:**
- `src/pages/Certificados.tsx` línea ~967-984: agregar `<TableHead className="w-8"></TableHead>` en el `<TableHeader>` de la tabla Obra.
- Agregar `<TableCell><Button Trash2 /></TableCell>` en cada `<TableRow>` de la tabla Obra.
- Ajustar `colSpan={11}` → `colSpan={12}` en el `<TableFooter>` de la tabla Obra.

---

### Pedido 2: Certificado mixto con sección "Obra" y sección "Servicio"

**Contexto:** El caso de uso es Pride: hay una parte de obra con acumulados (avance físico del contrato) y una parte de servicios/alquileres de maquinaria (sin acumulados, a precio unitario simple). Hoy solo puede elegirse uno u otro.

**Diseño de la solución:**

Agregar un tercer tipo de certificado: `"mixto"`. Cuando el tipo es "mixto", el certificado tiene dos secciones independientes:
- **Sección Obra** — usa los ítems marcados con `seccion: "obra"`, muestra la tabla de acumulados
- **Sección Servicio** — usa los ítems marcados con `seccion: "servicio"`, muestra la tabla simple de precio × cantidad

Para no modificar el esquema de base de datos, la `seccion` se almacena en el campo `etapa` del ítem con un prefijo especial (`__obra__` o `__serv__`), **pero esto sería hacky y confuso**. 

Mejor enfoque: **agregar una columna `seccion` a `certificado_items`** con valor `'obra'` o `'servicio'` (nullable, default `null` = sin distinción).

Alternativamente, la solución más simple y sin cambio de DB: **usar `categoria = "__OBRA__"` como discriminador** en los ítems de tipo mixto. Pero también hacky.

**La solución correcta y limpia:**

Agregar columna `seccion text` a `certificado_items` (nullable, default `null`). Los certificados de tipo `servicio` u `obra` no usan esta columna (todos sus ítems tienen `seccion = null`). Los certificados de tipo `mixto` tienen sus ítems con `seccion = 'obra'` o `seccion = 'servicio'`.

**Flujo de usuario para tipo "Mixto":**
1. Usuario selecciona tipo "Mixto" en el selector
2. El formulario muestra dos secciones claramente separadas con un divisor:
   - **"Sección Obra (con acumulados)"** — tabla de 13 columnas, con botón de eliminar
   - **"Sección Servicio (Alquiler / Precio × Cantidad)"** — tabla simple agrupada por categoría
3. Cada sección tiene su propio botón "+ Agregar concepto" que añade al array correspondiente
4. Los totales del certificado suman ambas secciones
5. Al guardar, los ítems llevan `seccion: 'obra'` o `seccion: 'servicio'` según su origen

**Cambios de base de datos:**
```sql
ALTER TABLE certificado_items ADD COLUMN seccion text DEFAULT NULL;
```

**Cambios en el hook `useCertificados`:**
- Agregar `seccion?: string | null` a `CertificadoItemForm` y `CertificadoItem`
- Actualizar `createCertificado` y `updateCertificado` para incluir `seccion` en el insert
- Agregar `"mixto"` al type `TipoCertificado`

**Cambios en `src/pages/Certificados.tsx`:**
- Nuevo `SelectItem value="mixto"` → "Mixto (Obra + Servicio)"
- Estado del draft se divide en dos arrays: `itemsDraftObra` y `itemsDraftServicio` (o se mantiene un solo array con campo `seccion`)
- Solución más limpia: mantener `itemsDraft` pero con campo `seccion` en cada ítem
- Nueva función `addConceptoToDraftSection(conceptoId, seccion)` que además de los datos del concepto, setea `seccion`
- Dos botones "Agregar concepto": uno para cada sección
- Render del formulario tipo mixto: renderizar primero la sección obra, luego la sección servicio

**Totales en tipo mixto:**
- La sección Obra muestra sus avances con la lógica de acumulados
- La sección Servicio muestra su subtotal simple
- Al final: suma de ambos + IVA 21%

**Vista y PDF tipo mixto:**
- `openViewCert`: al cargar ítems, separarlos por `seccion`
- Vista: primero muestra la tabla Obra, luego la tabla Servicio
- PDF: se añade una rama `mixto` en `generateCertificadoPDF` que combina ambas tablas

---

### Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `src/hooks/useCertificados.ts` | Agregar `"mixto"` al type `TipoCertificado`; agregar `seccion` a `CertificadoItemForm` y `CertificadoItem`; actualizar mutations para incluir `seccion` |
| `src/pages/Certificados.tsx` | Botón eliminar en tabla Obra; nuevo tipo "Mixto" en el Select; render dual del formulario; totales combinados; vista dual |
| `src/utils/generateCertificadoPDF.ts` | Nueva rama para tipo `mixto` en el PDF |
| **Migración DB** | `ALTER TABLE certificado_items ADD COLUMN seccion text DEFAULT NULL` |

---

### Secuencia de implementación

1. Migración de base de datos (agregar columna `seccion`)
2. Actualizar tipos y hook `useCertificados`
3. Actualizar `Certificados.tsx`: botón eliminar en Obra + tipo mixto completo
4. Actualizar `generateCertificadoPDF` para soportar mixto
