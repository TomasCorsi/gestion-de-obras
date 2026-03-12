

# Cambiar título del PDF de certificado

## Cambio

### `src/utils/generateCertificadoPDF.ts` — función `renderCertInfo`

**Línea 135**: Cambiar el texto del título de:
```
CERTIFICADO DE OBRA  Nº CERT-001
```
a:
```
CERTIFICADO - (nombre de obra) - N° 001
```

Se usará `obraNombre` (ya disponible como parámetro) y se extraerá solo el número del campo `certificado.numero` (quitando el prefijo "CERT-").

