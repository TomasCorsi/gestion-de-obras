
## Dos correcciones en el módulo de Certificados

### Problema 1: El período muestra un mes menos del correcto

**Causa**: En la línea 1222 de `src/pages/Certificados.tsx`, el período se convierte a fecha con `new Date(cert.periodo + "-01")`. Por ejemplo, `"2026-01-01"` se interpreta como medianoche UTC, y en zonas con UTC-3 (Argentina) eso equivale a las 21:00 del 31 de diciembre anterior. `format` de date-fns entonces muestra "Diciembre" en lugar de "Enero".

**Solución**: Reemplazar `new Date(cert.periodo + "-01")` por `parseISO(cert.periodo + "-01")`, que interpreta la fecha en hora local sin corrimiento UTC. Este mismo patrón ya está establecido en el proyecto como estándar (`date-handling-standard-v2`).

El mismo problema existe en el dialog de vista (línea ~1000) si se muestra el período allí.

**Archivo**: `src/pages/Certificados.tsx` — solo el componente `CertificadoCard` (línea 1222).

---

### Problema 2: Permitir editar el número del certificado

Actualmente el número se genera automáticamente al crear (`CERT-001`, `CERT-002`, etc.) y no hay forma de modificarlo. Se necesita:

**1. Hook `useCertificados.ts`**: Agregar soporte para actualizar el campo `numero` en la mutación `updateCertificado`. Actualmente `updateData` solo incluye `periodo`, `subtotal`, `iva`, `total`, `observaciones`, `tipo` y `anticipo_porcentaje`.

**2. `src/pages/Certificados.tsx`**:

- Agregar estado `const [numeroCert, setNumeroCert] = useState("")` junto al resto de estados del formulario.
- Popularlo al abrir edición: `setNumeroCert(cert.numero)` en `openEditCertificado`.
- Limpiarlo al crear: `setNumeroCert("")` en `openCrearCertificado` y `openDuplicarCertificado`.
- Agregar campo Input "Número" en el grid de campos del dialog (solo visible al editar, ya que al crear se genera automáticamente).
- Pasar `numero: numeroCert` al llamar a `updateCertificado`.

**Diseño del campo en el dialog** (solo en modo edición):
```
[Tipo]  [Período]  [Número]  [Anticipo%]  [Observaciones]
```
El campo Número aparece entre Período y Anticipo, solo cuando `isEditing === true`.

**3. `src/hooks/useCertificados.ts`**: En la mutación `updateCertificado`, incluir `numero` en el `updateData` si se pasa como parámetro:
```typescript
if (numero !== undefined) updateData.numero = numero;
```

---

### Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/Certificados.tsx` | Fix `parseISO` en `CertificadoCard` + campo editable de número en el dialog |
| `src/hooks/useCertificados.ts` | Agregar `numero` al `updateData` en `updateCertificado` |

**Sin cambios de base de datos** — el campo `numero` ya existe en la tabla `certificados`.
