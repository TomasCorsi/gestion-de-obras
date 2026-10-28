# Reorganización definitiva del launcher de Contabilidad (mapa CONTAD)

Solo navegación, nombres, alias de URLs y estados iniciales de pantallas compartidas. Sin cambios de base, permisos, lógica contable, módulos operativos ni rentabilidad. Diseño moderno actual.

## Árbol final

```text
Compras        Registro de Compras · Órdenes de Compra · Gastos Generales
Ventas         (comprobantes/facturación de clientes)
Egresos        Orden de Pago · Pagos realizados
Ingresos       Recibos de Cobranzas · Cobranzas Efectuadas
Proveedores    Códigos de Proveedores · Cuentas Corrientes (Próx.) · Totales por Proveedores (Próx.)
               Movimientos por Conceptos (Próx.) · Totales por Proveedores y por Vencimientos (Próx.)
               Deuda Vencida por Proveedores (Próx.) · Agenda de Pagos (Próx.)
Clientes       Códigos de Clientes · Cuentas Corrientes (Próx.) · Totales por Clientes (Próx.)
               Totales por Clientes y por Vencimientos (Próx.) · Deuda Vencida por Clientes (Próx.)
               Informe por Cliente (Próx.) · Facturas Pendientes de Cobro (Próx.)
Contable       Asientos Generales · Mayor de Cuentas · Sumas y Saldos · Plan de Cuentas
               Listado de Asientos · Libro Diario · Ejercicios · Libro Banco (Próx.)
               Cierre de Mes · Cierre de Ejercicio (Próx.) · Apertura de Ejercicio (Próx.)
Informes       Posición IVA (Próx.) · Movimiento Mensual de Cuentas (Próx.)
               Saldos de Caja y Bancos (Próx.) · Informes de Compras (Próx.)
               Informes de Ventas (Próx.) · Rentabilidad por Obra · Costo por Máquina
Impuestos      IVA (Libro IVA Compras / Libro IVA Ventas) · Impuesto IIBB (Próx.)
               Retenciones / Percepciones (Próx.) · Información de Compras/Ventas (Próx.)
               IVA Digital (Próx.)
Otras Opciones Centros de Costos · Sub Centros de Costos · Empresa · Fichas fiscales
```

No se agregan Stock ni Info Especial. Eliminadas como tarjetas: Libro Banco, Centros de costo, Configuración.

## Estados iniciales de pantallas compartidas
- Asientos Generales: pantalla normal con alta. Listado de Asientos: misma pantalla abierta en modo consulta (sin abrir alta).
- Cierre de Mes: pantalla de Ejercicios abierta directamente en períodos/cierre mensual.
- IVA: hoja con dos subaccesos que abren el Libro IVA actual en Compras o Ventas.
- Códigos de Clientes: monta el mismo maestro de `/clientes`; `/clientes` sigue funcionando. Mismo acceso Administrador que Proveedores.
- Centros y Sub Centros: misma pantalla actual, abierta en la pestaña correspondiente.

## Compatibilidad de URLs
Alias que redirigen al nuevo lugar: `banco`, `centros`, `config&s=empresa|plan|fichas`, `proveedores&s=ordenes-pago|comprobantes|fichas|maestro`, `clientes&s=cobranzas|comprobantes|fichas`, `compras&s=comprobantes`, `egresos&s=retenciones`, nombres anteriores de IVA. Recientes guardados se resuelven por alias o se descartan.

## Pruebas
- Cada destino aparece una sola vez como ubicación principal (salvo los dos estados explícitos de Asientos y Ejercicios).
- Orden de Pago no está en Proveedores; Retenciones no está en Egresos; Posición IVA no abre Libro IVA.
- Todas las rutas antiguas resuelven al nuevo lugar.
- Verificación visual del launcher y búsquedas (mayor, pago, proveedor, cliente, iva, centros, fichas).

## Detalles técnicos
- `src/lib/contabNav.ts`: árbol, tabla de alias, flag de estado inicial (`modo: "listado"`, subtab de períodos).
- `ContabLauncher.tsx`: iconos de Clientes y Otras Opciones.
- `src/pages/Contabilidad.tsx`: destino `clientes` montando el maestro existente; pasar estado inicial a Asientos y Ejercicios.
- Registrar en AGENTS.md la regla "una única ubicación principal por función; accesos secundarios solo contextuales".
