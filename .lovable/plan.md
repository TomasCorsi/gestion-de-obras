# Ingresos: opciones como en CONTAD

La sección Ingresos mostrará las tres opciones que usan en CONTAD, en este orden:

1. **Recibos de Cobranzas**: abre el formulario de nuevo cobro (igual que ahora).
2. **Valores en Cartera**: lista los cheques y e-cheques recibidos que siguen en cartera, con totales en pesos y dólares.
3. **Buscar Valores en Cartera**: la misma lista con buscador y filtros: número de cheque, banco, librador/CUIT, cliente, rango de vencimiento e importe.

"Cobranzas Efectuadas" sale de Ingresos, porque no figura en CONTAD. Para no perder el acceso a ese listado, sigue disponible como dirección antigua y desde la pestaña Cobranzas de la misma pantalla. Si prefieren conservarlo como cuarta tarjeta, avísenme.

No cambian la base de datos, los permisos ni cómo se guardan los cobros.

## Detalles técnicos
- En `contabNav.ts`, `ingresos.hijos` queda en: recibo, `valores-cartera` (pagos/subtab cheques) y `buscar-valores` (pagos/subtab cheques con foco en el buscador). Se agrega "cheques" a las subtabs permitidas de pagos, y `ingresos/cobranzas` y `clientes/cobranzas` quedan como alias hacia pagos/cobros.
- En `ChequesRecibidos` (PagosTab.tsx): se agrega un filtro de estado "en cartera", que es el predeterminado, junto con el buscador de texto y un rango de fechas e importes del lado del cliente. Con el modo búsqueda, el cursor queda en el buscador.
- Se actualizan las pruebas de navegación con el nuevo mapa y se verifica con Playwright.
