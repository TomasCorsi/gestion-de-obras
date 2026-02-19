

## Mostrar conceptos con cantidad cero en certificados y PDF

### Problema

En `src/hooks/useCertificados.ts`, al crear y actualizar certificados, se filtran los items con `.filter((i) => i.cantidad > 0)`. Esto elimina todos los conceptos donde no se cargo cantidad, y luego no aparecen en el certificado guardado ni en el PDF.

### Solucion

Remover el `.filter((i) => i.cantidad > 0)` en dos lugares del hook:

**Archivo:** `src/hooks/useCertificados.ts`

1. **Linea ~322** (createCertificado): quitar el filtro para que todos los items del draft se guarden, incluso con cantidad 0.
2. **Linea ~421** (updateCertificado): idem, quitar el filtro.

Esto hara que todos los conceptos cargados se persistan en la base de datos y aparezcan en la vista y el PDF, mostrando 0 en cantidad y subtotal cuando corresponda.

### Impacto

- Sin cambios de base de datos
- Sin cambios en el PDF (ya renderiza lo que recibe)
- Solo se modifican 2 lineas en `useCertificados.ts`
