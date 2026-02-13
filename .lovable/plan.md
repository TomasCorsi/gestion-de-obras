

## Rediseno profesional del PDF de Certificados

### Resumen de cambios

Se va a redisenar completamente el PDF de certificados para lograr un aspecto mas profesional y completo. Se eliminara informacion innecesaria (como el "TIPO"), se agregaran mas datos del cliente, y se mejorara la estetica general del documento.

### Cambios visuales principales

1. **Eliminar el badge "TIPO: OBRA / SERVICIO"** - No aporta valor al cliente receptor del certificado.

2. **Encabezado mejorado** - Linea de acento roja (color corporativo) debajo del header en lugar de la linea gris actual. Logo mas grande.

3. **Bloque de datos del cliente expandido** - Mostrar nombre, CUIT, direccion, localidad, telefono y email del cliente en un recuadro con borde lateral rojo, estilo profesional (dos columnas: datos de obra a la izquierda, datos del cliente a la derecha).

4. **Titulo del certificado mas destacado** - Centrado, con fondo de color corporativo oscuro y texto blanco.

5. **Tablas con encabezado rojo corporativo** - Cambiar el gris oscuro actual por el color rojo corporativo de Calamina Sur para los headers de tabla.

6. **Seccion de totales con recuadro profesional** - Caja con borde y fondo sutil, con linea separadora antes del total final.

7. **Pie de pagina** - Agregar numero de pagina y leyenda de confidencialidad.

8. **Firma mejorada** - Linea horizontal para la firma, con cargo y datos mas visibles.

### Detalle tecnico

**Archivo 1: `src/hooks/useObras.ts`**
- Ampliar el `select` de la query para traer mas campos del cliente: `clientes(id, nombre, cuit, direccion, localidad, telefono, email)`.
- Actualizar la interfaz `ObraWithRelations` para incluir los nuevos campos del cliente.

**Archivo 2: `src/pages/Certificados.tsx`**
- Pasar los datos adicionales del cliente al PDF: `clienteDireccion`, `clienteLocalidad`, `clienteTelefono`, `clienteEmail`.

**Archivo 3: `src/utils/generateCertificadoPDF.ts`**
- Actualizar la interfaz `CertificadoPDFData` con los nuevos campos del cliente.
- Redisenar `renderHeader()`:
  - Logo mas grande (40mm en vez de 35mm).
  - Linea de acento roja (#B40000) en vez de gris.
- Redisenar `renderCertInfo()`:
  - Eliminar el badge de tipo.
  - Titulo centrado con fondo rojo corporativo y texto blanco.
  - Bloque de informacion en dos columnas: obra (izquierda) y cliente (derecha) con borde lateral rojo.
  - Incluir direccion, localidad, telefono y email del cliente.
- Redisenar headers de tablas con color corporativo (#8B0000).
- Redisenar seccion de totales con recuadro con borde.
- Redisenar `renderFirma()`: Linea horizontal de firma, cargo mas visible.
- Agregar pie de pagina con numero de pagina y texto de confidencialidad.
- Agregar subtotales de etapas/categorias con estilo mas claro.
