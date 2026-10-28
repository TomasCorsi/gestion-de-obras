# Inicio de Contabilidad tipo App Launcher (solo navegación y diseño)

Sin cambios en la base de datos, la lógica contable ni la Fase 1D. Cada acceso abre una pantalla que ya existe. Los accesos que hoy no tienen pantalla aparecen como "Próximamente", deshabilitados y sin lógica nueva.

## Estructura

```text
Inicio Contable  (buscador de módulos + accesos recientes + 12 tarjetas)
 ├─ Compras ........ Comprobantes de compra
 ├─ Ventas ......... Comprobantes de venta
 ├─ Egresos ........ Orden de Pago | Pagos realizados | Retenciones*
 ├─ Ingresos ....... Recibos de Cobranza | Cobranzas realizadas
 ├─ Proveedores .... Cuenta Corriente* | Totales de Proveedores* | Órdenes de Pago | Comprobantes | Fichas fiscales
 ├─ Clientes ....... Cuenta Corriente* | Totales de Clientes* | Cobranzas | Comprobantes | Fichas fiscales
 ├─ Contable ....... Asientos Generales | Libro Diario | Mayor de Cuentas | Sumas y Saldos | Plan de Cuentas | Ejercicios
 ├─ Libro Banco* ... (sin pantalla actual)
 ├─ Impuestos ...... Libro IVA Compras | Libro IVA Ventas | Retenciones/Percepciones*
 ├─ Informes ....... Rentabilidad por Obra | Costo por Máquina
 ├─ Centros de costo  Centros y subcentros
 └─ Configuración .. Datos de la Empresa | Plan de Cuentas | Fichas fiscales
* = Próximamente (no existe pantalla hoy)
```

## Qué pantalla existente abre cada acceso

| Acceso | Pantalla actual |
|---|---|
| Compras / Proveedores > Comprobantes | Pestaña Compras (listado de comprobantes de compra) |
| Ventas / Clientes > Comprobantes | Pestaña Ventas |
| Egresos > Orden de Pago, Proveedores > Órdenes de Pago | Pagos / Cobranzas, sección Pagos, con el alta de pago abierta |
| Egresos > Pagos realizados | Pagos / Cobranzas, sección Pagos (listado) |
| Ingresos > Recibos de Cobranza | Pagos / Cobranzas, sección Cobranzas, con el alta abierta |
| Ingresos > Cobranzas realizadas, Clientes > Cobranzas | Pagos / Cobranzas, sección Cobranzas |
| Contable > Asientos Generales | Pestaña Asientos |
| Contable > Libro Diario / Mayor de Cuentas / Sumas y Saldos | Libros, en la pestaña Diario / Mayor / Sumas y Saldos |
| Contable > Plan de Cuentas, Configuración > Plan de Cuentas | Configuración, Plan de cuentas |
| Contable > Ejercicios | Pestaña Ejercicios (ejercicios y períodos) |
| Impuestos > Libro IVA Compras/Ventas | Reportes, Libro IVA (con el filtro Compras o Ventas preseleccionado) |
| Informes > Rentabilidad por Obra / Costo por Máquina | Reportes, en esas pestañas (solo lectura; rentabilidad no se toca) |
| Centros de costo | Configuración, Centros de costo |
| Proveedores/Clientes > Fichas fiscales, Configuración > Fichas fiscales | Configuración, Terceros |
| Configuración > Datos de la Empresa | Configuración, Empresa |

Pendientes que quedarían como "Próximamente": Cuenta Corriente y Totales de proveedores y clientes, Retenciones, Libro Banco y Retenciones/Percepciones en Impuestos. Se construirían en fases posteriores.

## Experiencia

- Pantalla de inicio con tarjetas grandes: icono, nombre CONTAD y una línea descriptiva. Grilla adaptable (4, 3, 2 o 1 columnas), con efecto al pasar el mouse en el rojo de Calamina.
- Buscador que filtra tarjetas y subaccesos (por ejemplo "mayor" muestra Contable > Mayor de Cuentas).
- Al entrar a un módulo: página con sus subaccesos como tarjetas más chicas.
- Breadcrumb fijo arriba ("Inicio Contable > Proveedores > Cuenta Corriente") y botón visible "Inicio Contable".
- Últimos 6 accesos recientes, guardados solo en este navegador (es solo comodidad; no da permisos).
- La sección elegida queda en la dirección de la página, así se puede recargar o compartir, y funciona el botón atrás.

## Detalle técnico

- `src/lib/contabNav.ts`: árbol de navegación declarativo (id, nombre, icono, descripción y destino `{tab, subtab?, filtro?, accion?}` o `proximamente`), más una función de búsqueda pura con tests.
- `src/components/contabilidad/ContabLauncher.tsx`, `ContabModulo.tsx` y `ContabBreadcrumb.tsx`.
- `pages/Contabilidad.tsx`: `useUrlState` con `?m=modulo&s=subacceso`. Sin `m` muestra el launcher; con destino, renderiza el Tab existente.
- Los Tabs existentes reciben props opcionales de valor inicial (`LibrosTab` subtab, `PagosTab` cobros/pagos y abrir alta, `ReportesTab` subtab y tipo IVA, `ConfigTab` subtab). Si no se pasan, se comportan igual que hoy.
- Solo tokens semánticos y componentes shadcn existentes. Sin migraciones ni cambios de hooks contables.
- Tests: búsqueda, que cada destino apunte a un tab existente y que el breadcrumb se arme bien.
