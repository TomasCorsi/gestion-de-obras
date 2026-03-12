

# Agregar pagos al PDF del certificado

## Cambios

### 1. `src/utils/generateCertificadoPDF.ts`
- Agregar `pagos?: CertificadoPago[]` al interface `CertificadoPDFData`
- En las 3 funciones de generación (`generateServicioPDF`, `generateObraPDF`, `generateMixtoPDF`), después de la línea de TOTAL, agregar líneas de pagos y saldo:
  - Si hay pagos, agregar cada pago como línea: `Pago dd/mm/yyyy: - $X`
  - Agregar línea bold: `SALDO PENDIENTE: $X`

### 2. `src/pages/Certificados.tsx`
- En `handleDownloadPDF`, pasar los pagos del certificado al generador:
  - Obtener pagos con `fetchPagos(cert.id)`
  - Pasarlos como prop `pagos` a `generateCertificadoPDF`

