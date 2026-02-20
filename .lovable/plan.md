

## Fix: Certificado items not showing when editing

### Problem
When editing a certificate (especially tipo "Mixto"), the saved items don't appear because the `seccion` column in the database is `null` for all existing items. The mixto rendering code filters strictly by `seccion === "obra"` and `seccion === "servicio"`, so items with `null` never match either filter and the form appears empty.

### Solution
Fix the `openEditCertificado` function to assign a default `seccion` value to items that have `null`, based on the certificate type:

- If the certificate is **tipo "servicio"**: keep `seccion: null` (this already works correctly)
- If the certificate is **tipo "obra"**: keep `seccion: null` (also works correctly)  
- If the certificate is **tipo "mixto"**: items with `null` seccion need to be assigned a default. Since there's no way to know which section they originally belonged to, assign them to `"servicio"` as a safe default (the user can reorganize them)

Additionally, fix the `openDuplicarCertificado` function with the same logic.

### Technical detail

**File:** `src/pages/Certificados.tsx`

In `openEditCertificado` (~line 322), when building the draft from saved items, add logic to assign `seccion` based on the cert type:

```typescript
const draft: CertificadoItemForm[] = items.map((item) => ({
  concepto_id: item.concepto_id,
  descripcion: item.descripcion,
  // ... other fields ...
  seccion: item.seccion || (cert.tipo === "mixto" ? "servicio" : null),
}));
```

Same fix applied in `openDuplicarCertificado` (~line 352).

This ensures that legacy items without a `seccion` value are visible when editing or duplicating mixto certificates.
