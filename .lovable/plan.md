## Sistema de Pagos para Certificados

Construir un sistema completo de cobranza sobre `certificado_pagos`, con vista global, di&aacute;logo mejorado, validaciones y recibo PDF.

### 1. Cambios de base de datos

Migraci&oacute;n sobre `certificado_pagos`:
- `metodo` text (transferencia / cheque / efectivo / echeq / otro)
- `referencia` text (N&deg; comprobante, cheque, etc.)
- `banco` text
- `comprobante_url` text (path en storage)

Nuevo bucket privado `certificado-comprobantes` con RLS:
- SELECT/INSERT/UPDATE/DELETE para `admin` y `capataz`.

Nuevo estado opcional en `estado_certificado` enum: `cobrado_parcial`. Si no se puede agregar al enum sin riesgo, se calcula en cliente y se mantiene `estado` actual ("emitido" mientras tenga saldo, "cobrado" al 100%).

### 2. Hook `useCertificados.ts`

- Extender `CertificadoPago` con los nuevos campos.
- `createPago` / `updatePago` (nuevo) aceptan los nuevos campos + archivo opcional (sube a storage y guarda `comprobante_url`).
- Nuevo helper `getEstadoEfectivo(cert)` &rarr; `borrador | emitido | cobrado_parcial | cobrado | vencido` (vencido = emitido + >30 d&iacute;as desde `fecha_emision` con saldo).
- Auto-actualizaci&oacute;n del campo `estado` del certificado al crear/eliminar pagos:
  - suma &ge; total &rarr; `cobrado` (+ set `fecha_emision` si faltara).
  - 0 < suma < total &rarr; mantener `emitido` (estado l&oacute;gico parcial calculado).
- `fetchAllPagosByObra` ya existe (`allPagos`); agregar `fetchAllPagos` global (sin obra) para la vista de pagos por obra ya cubre.

Validaci&oacute;n: en `createPago` rechazar si `monto + pagado_actual > total_certificado` (toast.error, no insert).

### 3. UI &mdash; Di&aacute;logo de detalle (mejora)

En el bloque de Pagos del `DetailDialog` actual:
- Form ampliado: Fecha | Monto | M&eacute;todo (Select) | Referencia | Banco | Descripci&oacute;n | Comprobante (input file).
- Tabla de pagos con columnas: Fecha, Monto, M&eacute;todo, Referencia, Comprobante (link), Acciones (editar / eliminar / descargar recibo PDF).
- Resumen: Total certificado / Pagado / Saldo / % cobrado (barra de progreso con color: rojo <50, amarillo <100, verde =100).
- Bot&oacute;n "Recibo PDF" por pago.

### 4. UI &mdash; Nueva pesta&ntilde;a "Pagos" (vista global por obra)

En `src/pages/Certificados.tsx` agregar `<TabsTrigger value="pagos">Pagos</TabsTrigger>` con:

- **KPIs** (4 tarjetas): Facturado total, Cobrado, Pendiente, Vencido (>30d emitido sin cobrar).
- **Filtros**: Mes (`type="month"`), Certificado (Select), M&eacute;todo (Select), B&uacute;squeda por referencia.
- **Tabla** ordenable: Fecha &middot; Cert. N&deg; &middot; Per&iacute;odo &middot; Cliente/Obra &middot; Monto &middot; M&eacute;todo &middot; Referencia &middot; Banco &middot; Comprobante &middot; Acciones.
- **Bot&oacute;n "Registrar pago"**: dialog que primero selecciona certificado (con saldo visible) y luego carga el pago.
- **Export CSV** de los pagos filtrados.

### 5. UI &mdash; Listado de certificados

Agregar columna "Saldo" y badge de estado efectivo (borrador / emitido / parcial / cobrado / **vencido**). Vista de cards: barra de progreso de cobranza.

### 6. Recibo PDF

Nuevo `src/utils/generateReciboPDF.ts` (jsPDF + autoTable, estilo coherente con `generateCertificadoPDF`):
- Encabezado con logo, n&deg; de recibo (`REC-<cert.numero>-<n>`), fecha.
- Datos del cliente y obra, certificado asociado.
- Detalle del pago: monto en n&uacute;meros y letras, m&eacute;todo, referencia, banco.
- Pie con saldo restante y firma.

### 7. Detalles t&eacute;cnicos

```text
estado_efectivo(cert, pagado):
  if estado == 'borrador' -> 'borrador'
  if pagado >= total      -> 'cobrado'
  if pagado > 0           -> 'parcial'
  if fecha_emision && hoy - fecha_emision > 30d -> 'vencido'
  else -> 'emitido'
```

Subida de comprobante:
```ts
const path = `${obraId}/${certId}/${crypto.randomUUID()}-${file.name}`;
await supabase.storage.from('certificado-comprobantes').upload(path, file);
// guardar path; al mostrar usar createSignedUrl(path, 3600)
```

### Archivos afectados
- `supabase/migrations/...` (nueva tabla columnas + bucket + policies).
- `src/hooks/useCertificados.ts` (tipos, mutaciones, helpers).
- `src/pages/Certificados.tsx` (di&aacute;logo + nueva pesta&ntilde;a Pagos + columna saldo).
- `src/utils/generateReciboPDF.ts` (nuevo).

### Fuera de alcance
- Conciliaci&oacute;n bancaria autom&aacute;tica.
- Cobranzas multi-obra en una sola vista (cada obra mantiene su pesta&ntilde;a).
