

# Plan: Agregar columna "Observaciones" a ítems de certificado

## Cambios necesarios

### 1. Migración de base de datos
Agregar columna `observaciones` (tipo `text`, nullable) a la tabla `certificado_items`.

### 2. `src/hooks/useCertificados.ts`
- Agregar `observaciones?: string` a la interfaz `CertificadoItemForm`
- Incluir el campo en las operaciones de insert (crear y actualizar certificado)

### 3. `src/components/certificados/CertificadoServiceGrid.tsx`
- Agregar columna "Observaciones" en el `TableHeader` después de "Subtotal"
- Agregar un `Input` de texto en cada fila para editar observaciones
- Inicializar el campo en `addConceptoToGroup` con valor vacío

### 4. `src/pages/Certificados.tsx`
- Incluir `observaciones: ""` en los items del draft cuando se construyen nuevos ítems

