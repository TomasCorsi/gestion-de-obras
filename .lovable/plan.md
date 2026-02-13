
## Corregir etapas faltantes en el PDF de certificados tipo Obra

### Problema
Al generar el PDF del certificado CERT-001 de Pride Center, solo aparece "ETAPA 2". Las etapas "ESTACIONAMIENTO" y "ALIVIADOR DE LAGUNA" no se muestran.

**Causa raiz:** Cuando se guarda un certificado, solo se insertan items con `cantidad > 0` (linea 316 de `useCertificados.ts`). Esto es correcto para no guardar datos vacios. Sin embargo, al generar el PDF de tipo "obra", solo se pasan esos items guardados. Los conceptos de otras etapas que no tuvieron avance en este periodo quedan fuera del PDF, incluso si deberian mostrarse con avance anterior o simplemente como parte del contrato completo.

### Solucion
Modificar la generacion del PDF para certificados tipo "obra": en lugar de usar solo los items guardados del certificado, combinar todos los conceptos activos de la obra con los items del certificado. Asi, todas las etapas aparecen en el PDF mostrando su estado completo (avance anterior, actual y acumulado).

### Cambios tecnicos

**Archivo: `src/pages/Certificados.tsx`** (funcion `handleDownloadPDF`)

Cuando el certificado es tipo "obra":
1. Obtener todos los conceptos activos de la obra
2. Para cada concepto, buscar si tiene un item en el certificado actual
3. Crear una lista completa de items: los que tienen datos del certificado usan esos datos, y los que no, se crean con cantidad 0 y su precio unitario del concepto
4. Pasar esta lista completa al generador de PDF

Esto asegura que todas las etapas (ETAPA 2, ESTACIONAMIENTO, ALIVIADOR DE LAGUNA) aparezcan en el PDF con sus valores correctos, incluso si no tuvieron avance en el periodo actual.

**Archivo: `src/utils/generateCertificadoPDF.ts`** (funcion `generateObraPDF`)

No requiere cambios estructurales. La funcion ya maneja correctamente items con cantidad 0 (mostraria 0% actual y los valores acumulados correspondientes). Solo recibira mas items de los que recibia antes.
