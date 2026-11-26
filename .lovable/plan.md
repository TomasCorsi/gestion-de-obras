# Gastos sin factura dentro de Registro de Compras

## Qué va a ver el usuario
- En **Compras** quedan dos tarjetas: **Registro de Compras** y **Órdenes de Compra**. Se quita la tarjeta "Gastos Generales".
- Al entrar a **Registro de Compras** aparecen dos pestañas arriba:
  - **Facturas de proveedores**: lo que existe hoy (con importación de factura con IA y vínculo a OC).
  - **Gastos sin factura**: la misma pantalla actual de Gastos Generales (carga, lista, filtros, totales, obra/máquina), con un aviso arriba: "Si el gasto tiene factura a nombre de la empresa, cargalo en Facturas de proveedores".
- La pestaña elegida se recuerda en la dirección de la página, como el resto de las pantallas.
- Los enlaces viejos a Gastos Generales (búsqueda, accesos guardados) abren directamente la pestaña **Gastos sin factura**.
- La pestaña de gastos se muestra solo a quienes hoy pueden ver Gastos Generales (administrador). Contadores sin ese permiso ven solo Facturas.
- No cambian los datos ya cargados ni cómo cuentan en rentabilidad y reportes de obra.

## Detalles técnicos
- `contabNav.ts`: quitar la hoja `gastos` de Compras; agregar `SUBTABS.compras = ["facturas", "sin-factura"]`; mantener `gastos` como alias que resuelve a `{ pantalla: "compras", subtab: "sin-factura" }`. Actualizar la descripción del módulo.
- `Contabilidad.tsx`: en `case "compras"`, envolver `ComprobantesTab` y `GastosGeneralesTab` en Tabs sincronizadas con la URL; la pestaña sin factura solo si el permiso `admin` aplica. El case `gastos` redirige al subtab.
- `GastosGeneralesTab`: prop opcional para ocultar su título propio y mostrar el aviso; sin cambios de datos (`otros_gastos`).
- Actualizar `contabNav.test.ts`: Compras tiene 2 hojas, el alias `gastos` abre Compras > Registro de Compras > Gastos sin factura, y la búsqueda "gastos" sigue encontrándolo. Correr los tests.
- Registrar en `AGENTS.md` que los gastos sin factura viven como subtab de Registro de Compras, reutilizando la pantalla existente.
