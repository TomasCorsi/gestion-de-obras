
## Problema: No se pueden agregar conceptos en tipo Mixto

### Causa raíz

La variable `conceptosNoEnDraft` filtra todos los conceptos que ya están en el draft, sin importar en qué sección están:

```typescript
const conceptosNoEnDraft = conceptos.filter(
  (c) => c.activo && !itemsDraft.some((i) => i.concepto_id === c.id)
);
```

Esto causa dos problemas en el tipo "Mixto":

1. Si un concepto ya fue agregado a la sección "Obra", deja de aparecer como disponible para la sección "Servicio" (y viceversa).
2. El botón "+ Agregar concepto" usa `{conceptosNoEnDraft.length > 0 && ...}` para mostrarse, por lo que si todos los conceptos ya están en alguna sección, el botón directamente desaparece aunque la sección actual esté vacía.

En el tipo Mixto tiene sentido que el mismo concepto pueda aparecer en ambas secciones (por ejemplo: "Horas Retroexcavadora" en Obra con acumulados, y también en Servicio con precio simple).

---

### Solución

**Archivo:** `src/pages/Certificados.tsx`

#### Cambio 1 — Crear filtros por sección

Reemplazar `conceptosNoEnDraft` con dos variantes: una para cada sección en modo mixto, y mantener la original para obra/servicio simple.

```typescript
// Para tipo "obra" y "servicio" (sin sección): conceptos no en draft
const conceptosNoEnDraft = conceptos.filter(
  (c) => c.activo && !itemsDraft.some((i) => i.concepto_id === c.id)
);

// Para tipo "mixto": por sección independiente
const conceptosNoEnDraftObra = conceptos.filter(
  (c) => c.activo && !itemsDraft.some((i) => i.concepto_id === c.id && i.seccion === "obra")
);
const conceptosNoEnDraftServicio = conceptos.filter(
  (c) => c.activo && !itemsDraft.some((i) => i.concepto_id === c.id && i.seccion === "servicio")
);
```

#### Cambio 2 — Usar el filtro correcto en cada sección

En la sección Obra del formulario Mixto (línea ~1034), usar `conceptosNoEnDraftObra` en lugar de `conceptosNoEnDraft`:

```tsx
{conceptosNoEnDraftObra.length > 0 && (
  <Button ... onClick={() => { setAddExtraConceptoOpen(true); setAddExtraConceptoSection("obra"); }}>
    Agregar concepto
  </Button>
)}
```

En la sección Servicio (línea ~1127), usar `conceptosNoEnDraftServicio`:

```tsx
{conceptosNoEnDraftServicio.length > 0 && (
  <Button ... onClick={() => { setAddExtraConceptoOpen(true); setAddExtraConceptoSection("servicio"); }}>
    Agregar concepto
  </Button>
)}
```

#### Cambio 3 — Mostrar el listado correcto en el dialog "Agregar concepto"

El dialog (línea ~1303) actualmente siempre muestra `conceptosNoEnDraft`. Para el tipo Mixto, debe mostrar la lista filtrada según qué sección se está agregando (`addExtraConceptoSection`):

```typescript
const conceptosParaAgregar = tipoCert === "mixto"
  ? (addExtraConceptoSection === "obra" ? conceptosNoEnDraftObra : conceptosNoEnDraftServicio)
  : conceptosNoEnDraft;
```

Y en el render del dialog, usar `conceptosParaAgregar.map(...)` en lugar de `conceptosNoEnDraft.map(...)`.

---

### Resumen de cambios

| Archivo | Cambio |
|---|---|
| `src/pages/Certificados.tsx` | Agregar `conceptosNoEnDraftObra` y `conceptosNoEnDraftServicio`; actualizar las condiciones de visibilidad de los botones en la sección Mixto; usar el listado correcto en el dialog de selección |

**Sin cambios de base de datos ni de hooks** — el campo `seccion` ya existe y funciona. El problema es solo en la lógica de filtrado del lado del cliente.
