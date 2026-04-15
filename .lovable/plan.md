

## Plan: Permitir nombre/número en creación y certificados con mismo período

### Problemas actuales

1. **Número solo editable al editar**: El campo "Número" del certificado solo aparece cuando `isEditing` es true (línea 1058). Al crear, se auto-genera como `CERT-001`, `CERT-002`, etc.

2. **No se pasa el número al crear**: La mutación `createCertificado` en `useCertificados.ts` genera el número automáticamente y no acepta uno personalizado.

### Cambios

**1. `src/pages/Certificados.tsx`**
- Mostrar el campo "Número" siempre (quitar la condición `isEditing`)
- Pre-rellenar con el siguiente número auto-generado (CERT-XXX) para que el usuario pueda cambiarlo si quiere
- Pasar `numeroCert` al `createCertificado` cuando se crea

**2. `src/hooks/useCertificados.ts`**
- Agregar parámetro opcional `numero` a `createCertificado`
- Si el usuario pasa un número personalizado, usarlo; si no, usar el auto-generado

### Archivos a modificar
- `src/pages/Certificados.tsx` — mostrar campo Número en creación y pasar el valor
- `src/hooks/useCertificados.ts` — aceptar número personalizado en createCertificado

