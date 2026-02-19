
## Rediseño del módulo de Conceptos y del selector de conceptos en certificados

### Lo que el usuario pide

1. **Pestaña "Conceptos"**: dividir en dos secciones — "Conceptos de Obra" y "Conceptos de Servicio" — cada una con su propio botón "Agregar concepto".
2. **Crear certificado**: al seleccionar el tipo, cargar automáticamente los conceptos correctos:
   - **Obra** → solo conceptos de tipo Obra
   - **Servicio** → solo conceptos de tipo Servicio
   - **Mixto** → ambas secciones separadas, con los conceptos de cada tipo
3. **Dialog "Agregar concepto"**: permitir selección **múltiple** y mostrar los conceptos agrupados por Categoría → Sub Categoría.

---

### Cambio de datos necesario

Los conceptos actualmente no tienen un campo `tipo` (obra/servicio). Hay que agregar esta información. La solución más limpia es agregar una columna `tipo` a `certificado_conceptos` con valores `'obra'` o `'servicio'`, default `'servicio'`.

**Migración SQL:**
```sql
ALTER TABLE certificado_conceptos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'servicio';
```

Los conceptos existentes quedarán como `'servicio'` hasta que el usuario los reclasifique.

---

### Resumen de cambios por archivo

#### 1. Migración de base de datos
- Agregar columna `tipo text NOT NULL DEFAULT 'servicio'` a `certificado_conceptos`.

#### 2. `src/hooks/useCertificados.ts`
- Agregar campo `tipo: 'obra' | 'servicio'` a `CertificadoConcepto` y a `ConceptoForm`.
- Incluir `tipo` en los `select` y `insert` de conceptos.

#### 3. `src/pages/Certificados.tsx` — Pestaña "Conceptos"

La pestaña actual tiene una lista plana agrupada por categoría. Se reemplaza por **dos secciones visualmente separadas**:

```
┌─────────────────────────────────┐
│ CONCEPTOS DE OBRA               │
│  [Agregar concepto de Obra]     │
│  ┌───────────────────────────┐  │
│  │ Categoría: Alquiler...    │  │
│  │   Sub Cat: ETAPA 1        │  │
│  │     - Horas Retro...      │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│ CONCEPTOS DE SERVICIO           │
│  [Agregar concepto de Servicio] │
│  ┌───────────────────────────┐  │
│  │ Categoría: Transporte     │  │
│  │   - Viajes                │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- El dialog de "Agregar concepto" recibe como prop el `tipo` que se va a crear (`'obra'` o `'servicio'`), y el campo tipo se predefine y no es editable en ese contexto (o se pre-selecciona).
- La tabla de conceptos conserva todas las columnas actuales.

#### 4. `src/pages/Certificados.tsx` — `openCrearCertificado`

Actualmente carga **todos** los conceptos activos en el draft. Se cambia para:
- `tipoCert === "servicio"` → solo conceptos con `tipo === 'servicio'`
- `tipoCert === "obra"` → solo conceptos con `tipo === 'obra'`  
- `tipoCert === "mixto"` → conceptos de obra con `seccion: 'obra'` + conceptos de servicio con `seccion: 'servicio'`

Además, cuando el usuario **cambia el tipo** del certificado (`tipoCert`), el draft debe recargarse con los conceptos correspondientes.

#### 5. `src/pages/Certificados.tsx` — Dialog "Agregar concepto" (multi-select con grupos)

El dialog actual muestra una lista plana y solo permite seleccionar uno a la vez. Se rediseña para:

- Mostrar conceptos agrupados: **Categoría → Sub Categoría → Concepto**
- Checkbox en cada fila para selección múltiple
- Botón "Agregar seleccionados (N)" que agrega todos de una vez
- La lista a mostrar depende de qué sección se está agregando:
  - Para tipo `obra` o sección `obra` en mixto → conceptos con `tipo === 'obra'`
  - Para tipo `servicio` o sección `servicio` en mixto → conceptos con `tipo === 'servicio'`

**Estructura visual del dialog:**
```
┌─ Agregar conceptos ──────────────────────┐
│ Categoría: Alquiler de Maquinas          │
│   Sub Categoría: ETAPA 1                 │
│   ☑ Horas Retroexcavadora   HR          │
│   ☐ Horas Cargadora          HR          │
│   Sub Categoría: ETAPA 2                 │
│   ☐ Horas Topador            HR          │
│ Categoría: Materiales                    │
│   ☐ Tosca                    M3          │
│ ─────────────────────────────────────── │
│              [Cancelar] [Agregar (2)]    │
└──────────────────────────────────────────┘
```

#### 6. `src/pages/Certificados.tsx` — `conceptosNoEnDraftObra/Servicio` (filtros)

Se actualiza la lógica de filtrado para tener en cuenta el nuevo campo `tipo`:
- `conceptosNoEnDraftObra` → conceptos con `tipo === 'obra'` no en el draft con `seccion === 'obra'`
- `conceptosNoEnDraftServicio` → conceptos con `tipo === 'servicio'` no en el draft con `seccion === 'servicio'`
- `conceptosNoEnDraft` (para obra/servicio puros) → conceptos del tipo correspondiente no en draft

---

### Secuencia de implementación

1. Ejecutar migración SQL (agrega columna `tipo` a `certificado_conceptos`)
2. Actualizar `useCertificados.ts` (tipos e interfaz)
3. Actualizar `Certificados.tsx`:
   - Pestaña Conceptos: dos secciones con sus propios botones
   - Dialog "Agregar concepto": pasar `tipo` como contexto
   - `openCrearCertificado`: filtrar conceptos por tipo al inicializar draft
   - Efecto al cambiar `tipoCert`: recargar draft con conceptos del tipo correcto
   - Dialog "Agregar concepto" rediseñado: multi-select agrupado por categoría/subcategoría

### Sin cambios en

- PDF (`generateCertificadoPDF.ts`) — no requiere cambios estructurales
- Base de datos más allá de la migración indicada
- Hook `useCertificados` más allá de los tipos

