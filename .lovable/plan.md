

# Opción para incluir/excluir IVA en certificados y PDF

## Enfoque
Agregar un campo `incluir_iva` (boolean, default `true`) al certificado. Cuando esté desactivado, IVA = 0 y total = subtotal. Se refleja tanto en la UI del formulario como en el PDF.

## Cambios

### 1. Migración de base de datos
Agregar columna `incluir_iva` a la tabla `certificados`:
```sql
ALTER TABLE certificados ADD COLUMN incluir_iva boolean NOT NULL DEFAULT true;
```

### 2. `src/hooks/useCertificados.ts`
- Agregar `incluir_iva: boolean` al interface `Certificado`
- En `createCertificado` y `updateCertificado`: recibir parámetro `incluir_iva`, calcular IVA condicionalmente (`incluir_iva ? subtotal * 0.21 : 0`)

### 3. `src/pages/Certificados.tsx`
- Nuevo estado `incluirIva` (default `true`) para el formulario de crear/editar
- Switch/checkbox "Incluir IVA (21%)" en la sección de totales del formulario
- Cuando `incluirIva = false`: mostrar IVA como $0 o no mostrarlo
- Pasar `incluir_iva` a `createCertificado` / `updateCertificado`
- Al abrir edición, cargar el valor guardado
- En la vista de detalle, ocultar línea de IVA si `incluir_iva = false`

### 4. `src/utils/generateCertificadoPDF.ts`
- Agregar `incluir_iva?: boolean` a `CertificadoPDFData`
- En las 3 funciones de generación: solo agregar línea "IVA (21%)" si `incluir_iva !== false`
- TOTAL = subtotal (sin IVA) cuando `incluir_iva = false`

