# Certificados: múltiples por período + fecha de creación

## Cambios

### 1. Base de datos (migración)
- Eliminar constraint `UNIQUE(obra_id, periodo)` de la tabla `certificados` (definido en migración `20260212150507`). Esto permite crear varios certificados para el mismo período (ej. dos en abril).
- Agregar columna `fecha_certificado DATE` (default `CURRENT_DATE`) a la tabla `certificados`. Será la fecha de creación/emisión manual editable, independiente de `created_at` (timestamp técnico) y de `fecha_emision` (que se setea cuando pasa a estado "emitido").

### 2. Hook `src/hooks/useCertificados.ts`
- Agregar `fecha_certificado: string` al tipo `Certificado`.
- En `createCertificado` y `updateCertificado`: aceptar y persistir `fecha_certificado`.
- Auto-numerado: actualmente usa el conteo de certificados de la obra (`CERT-001`, etc.). Mantener; sigue siendo único aunque se repita período.
- En `fetchAcumulados`: como ahora pueden existir varios certificados con el mismo período, cambiar el filtro `lt("periodo", periodoActual)` para que use `fecha_certificado` (o combinación período + fecha) y así no se pierdan acumulados de certificados del mismo período creados antes.

### 3. UI `src/pages/Certificados.tsx`
- En el diálogo de crear/editar certificado: agregar un campo **"Fecha del certificado"** (DatePicker shadcn, formato dd/mm/yyyy) junto al campo de período. Default: hoy.
- En la tabla/listado de certificados: agregar columna **"Fecha"** mostrando `fecha_certificado` formateada con `formatDate()`.
- Quitar cualquier validación de UI que impida repetir período en la misma obra (si existe).

### 4. PDF `src/utils/generateCertificadoPDF.ts`
- Si el PDF muestra el período, agregar también la fecha del certificado en el encabezado.

## Notas técnicas
- La eliminación del UNIQUE no afecta datos existentes.
- `fecha_emision` se mantiene tal cual (se setea automático al cambiar estado a "emitido").
- `created_at` no se toca (timestamp del sistema).
