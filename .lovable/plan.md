
## Problema: Las sub categorías no aparecen al crear un certificado de tipo Servicio

### Causa raíz

En el dialog de crear/editar certificado, cuando el tipo es **Servicio**, los ítems se agrupan únicamente por `categoria` usando `draftGroupedCategoria`. Esto muestra la categoría como encabezado, pero dentro de cada categoría los conceptos se listan todos juntos, sin mostrar la **sub categoría (etapa)** como sub-encabezado.

El campo `etapa` existe en los ítems del draft (se carga correctamente desde los conceptos), pero en el modo Servicio el código actual no lo usa para sub-agrupar.

---

### Solución: Agregar sub-agrupamiento por etapa dentro de cada categoría (modo Servicio)

En el bloque de renderizado del modo Servicio (líneas 840-891 de `Certificados.tsx`), se agrega un segundo nivel de agrupamiento: dentro de cada `categoria`, se agrupan los ítems por su `etapa`. Cuando hay ítems sin etapa, se muestran directamente sin sub-encabezado.

**Antes (solo 1 nivel):**
```
[Alquiler de Maquinas]   ← encabezado de categoría
  Retroexcavadora | HR | 0 | 90,000 | ...
  Cargadora       | HR | 0 | 85,000 | ...
```

**Después (2 niveles):**
```
[Alquiler de Maquinas]   ← encabezado de categoría
  [Enero - Semana 1]     ← sub-encabezado de sub categoría (etapa)
    Retroexcavadora | HR | 0 | 90,000 | ...
  [Enero - Semana 2]
    Cargadora       | HR | 0 | 85,000 | ...
```

Si un ítem no tiene etapa asignada, se lista directamente bajo la categoría sin sub-encabezado extra.

---

### Cambio técnico

**Archivo:** `src/pages/Certificados.tsx`

**Sección modificada:** El bloque de renderizado del modo Servicio (dentro del div `draftGroupedCategoria.map(...)`, aproximadamente líneas 841-891).

**Lógica nueva dentro del map de cada `group` (categoria):**

1. Agrupar `group.items` por `etapa` usando `groupByEtapa`
2. Si todos los ítems de la categoría tienen `etapa === null/undefined`, renderizar la tabla directamente (sin sub-encabezado)
3. Si hay ítems con etapa, renderizar un sub-encabezado más suave (fondo más claro que el encabezado de categoría) con la etiqueta de la etapa, y debajo la tabla con los ítems de esa etapa

**Estilo propuesto para sub-encabezado:**
- Encabezado de categoría: `bg-muted px-3 py-2 rounded-t-md font-semibold text-sm` (sin cambios)
- Sub-encabezado de etapa: `bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground border-l-2 border-primary/40 ml-1 mt-1`

---

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/Certificados.tsx` | Sub-agrupar por `etapa` dentro de cada `categoria` en el renderizado del modo Servicio del dialog de crear/editar |

**Sin cambios de base de datos ni de hooks** — los campos ya existen y se cargan correctamente. El problema era solo visual en el render.
