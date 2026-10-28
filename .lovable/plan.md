# Reorganización del launcher de Contabilidad según el mapa mental de CONTAD

Solo navegación y nombres. Diseño moderno actual, sin cambios de base, lógica contable, permisos, módulos operativos ni rentabilidad. Se reutilizan las pantallas existentes.

## Árbol propuesto (validado contra las capturas)

```text
Compras        Registro de Compras · Órdenes de Compra · Gastos Generales
Ventas         (pantalla actual de comprobantes de venta)
Egresos        Orden de Pago · Pagos realizados · Retenciones (Próx.)
Ingresos       Recibos de Cobranzas · Cobranzas Efectuadas
Proveedores    Códigos de Proveedores · Cuentas Corrientes (Próx.) · Totales por Proveedores (Próx.)
               Movimientos por Conceptos (Próx.) · Totales por Proveedores y por Vencimientos (Próx.)
               Deuda Vencida por Proveedores (Próx.) · Agenda de Pagos (Próx.) · Fichas fiscales
Clientes       Códigos de Clientes · Cuentas Corrientes (Próx.) · Totales por Clientes (Próx.)
               Totales por Clientes y por Vencimientos (Próx.) · Deuda Vencida por Clientes (Próx.)
               Informe por Cliente (Próx.) · Facturas Pendientes de Cobro (Próx.)
               Cobranzas · Comprobantes · Fichas fiscales
Contable       Asientos Generales · Mayor de Cuentas · Sumas y Saldos · Plan de Cuentas
               Listado de Asientos · Libro Diario · Ejercicios · Libro Banco (Próx.)
               Cierre de Mes · Cierre de Ejercicio (Próx.) · Apertura de Ejercicio (Próx.)
Informes       Posición IVA · Movimiento Mensual de Cuentas · Saldos de Caja y Bancos
               Informes de Compras · Informes de Ventas · Rentabilidad por Obra · Costo por Máquina
Impuestos      IVA (Libro IVA Compras/Ventas actuales) · Impuesto IIBB (Próx.)
               Retenciones / Percepciones (Próx.) · Información de Compras/Ventas · IVA Digital (Próx.)
Otras Opciones Centros de Costos · Sub Centros de Costos · Empresa
```

Se eliminan como tarjetas principales: Libro Banco, Centros de costo y Configuración (renombrada Otras Opciones). Orden de Pago sale de Proveedores. Plan de Cuentas y Fichas fiscales salen de Configuración.

## Duplicaciones y faltantes detectados — necesito tu decisión

1. **Clientes › Cobranzas** repite Ingresos › Cobranzas Efectuadas (misma pantalla). Propongo mantenerlo como acceso contextual o quitarlo.
2. **Clientes › Comprobantes** repite Ventas (misma pantalla). En CONTAD la facturación vive en Ventas, no en Clientes.
3. **Fichas fiscales** aparece en Proveedores y en Clientes; es una única pantalla que abarca a ambos. Con Configuración eliminada, no tiene otra ubicación. En CONTAD lo más cercano es "Grupo de Clientes/Prov." en Otras Opciones.
4. **Listado de Asientos** no existe como pantalla distinta de Asientos Generales/Libro Diario. Propongo que abra el listado de Asientos Generales, o marcarlo Próximamente.
5. **Cierre de Mes** existe hoy como cierre de períodos dentro de Ejercicios. Propongo que abra esa pantalla.
6. **Informes nuevos** (Posición IVA, Movimiento Mensual de Cuentas, Saldos de Caja y Bancos, Informes de Compras/Ventas) e **Información de Compras/Ventas** en Impuestos no tienen pantalla. Irán como Próximamente; Posición IVA puede abrir el Libro IVA actual.
7. **Retenciones** aparece en Egresos y en Impuestos (ambos Próximamente). Propongo dejarlo solo en Impuestos.
8. **Stock** e **Info Especial** existen en CONTAD pero no en el árbol. Stock ya es un módulo operativo del ERP; no se agrega salvo que lo pidas.
9. **Códigos de Clientes**: el maestro de Clientes hoy no se abre dentro de Contabilidad; se reutilizará la misma pantalla de `/clientes` (que se mantiene como ruta compatible). Quedará con el mismo acceso de Administrador que Códigos de Proveedores.

## Compatibilidad
- Se conservan buscador, recientes, breadcrumbs, botón Inicio Contable y permisos.
- Los enlaces viejos (`?m=banco`, `?m=centros`, `?m=config&s=...`, `?m=proveedores&s=ordenes-pago`, `?m=compras&s=comprobantes`) se redirigen a la nueva ubicación; los recientes guardados que apunten a ubicaciones eliminadas se descartan o redirigen.

## Detalles técnicos
- Cambios en `src/lib/contabNav.ts` (árbol, alias de rutas antiguas), `ContabLauncher.tsx` (iconos de nuevas tarjetas) y `src/pages/Contabilidad.tsx` (nuevo destino "clientes" que monta el maestro existente).
- Test que verifique: cada destino aparece una sola vez como ubicación principal, rutas antiguas resuelven al nuevo lugar, Orden de Pago no está en Proveedores.
- Verificación visual con Playwright del launcher y búsquedas.
