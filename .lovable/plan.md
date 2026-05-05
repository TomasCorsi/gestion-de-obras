
# Plan de mejoras para Certificados (puntos 1.1, 1.2, 1.3, 1.5, 1.6, 2.8)

## 1.1 Filtros y búsqueda en el listado
En `src/pages/Certificados.tsx`, sobre la grilla de cards, agregar `FilterBar` con:
- Búsqueda por número (input).
- Select de **estado** (todos/borrador/emitido/cobrado).
- Select de **tipo** (todos/obra/servicio/mixto).
- Rango de **período** (desde/hasta `yyyy-MM`) y rango opcional de **fecha de certificado**.
- Toggle **Cards / Tabla**: nueva vista tabla con columnas Número, Período, Fecha, Tipo, Estado, Subtotal, Total, Pagado, Saldo, Acciones.

Estado sincronizado con URL vía `useUrlState` (siguiendo memoria `app-state-persistence-url-v3`). Filtrado se aplica a `certificados` antes del render.

## 1.2 KPIs adicionales
Reemplazar/extender los 4 KPI cards actuales con:
- Total certificados (existente).
- Monto total facturado (existente).
- **% de cobranza** = `montoCobrado / montoTotal * 100`.
- **Antigüedad promedio de pendientes** en días (promedio de `now - fecha_emision` para certs no cobrados con `fecha_emision` set).
- Pendiente de cobro (existente, conservar).

Cálculos memoizados en el componente.

## 1.3 Card de certificado más informativa
En la card de cada certificado:
- **Barra de progreso de cobranza** (`<Progress value={pagado/total*100}/>`) con etiqueta "Cobrado X de Y (Z%)".
- Badge "Pagos parciales" cuando `0 < pagado < total`.
- Badge "Hace N días" cuando estado=emitido, calculando días desde `fecha_emision`.
- En vista tabla mostrar el % como columna.

## 1.5 Vista de detalle (`viewCert` dialog)
- Botón **"Duplicar este certificado"** que abre el flujo de creación pre-cargado con los items de ese cert (refactor: extraer la lógica actual de `openDuplicarCertificado` a `duplicateFromCert(cert)`).
- **Saldo pendiente destacado** en la sección de pagos (bloque grande con `formatCurrency(total - pagado)`).
- Validación al cargar pago: bloquear `monto > saldo` mostrando mensaje inline.
- **Historial de estados**: como no hay tabla de auditoría, mostrar timeline simple usando `created_at` (creado), `fecha_emision` (emitido) y la fecha del último pago que cierra el total (cobrado). Listado pequeño con iconos.

## 1.6 Pestaña Conceptos
En la sección Conceptos:
- **Buscador** por nombre + filtro por **categoría** y **etapa** (selects).
- **Edición inline** de `precio_unitario`: la celda del precio se vuelve `Input number` que dispara `updateConcepto` on blur (debounced).
- **Importación masiva CSV**: nuevo `ConceptosCSVImportDialog` siguiendo el patrón de `src/components/personal/CSVImportDialog.tsx`. Columnas: nombre, unidad, precio_unitario, categoria, cantidad_total, etapa, tipo. Inserta en lote vía `createConcepto` o un `insert` directo.
- **Ajuste masivo de precios**: botón "Ajustar precios %" que abre dialog con: select categoría (o "Todas"), input %, vista previa de cuántos conceptos se afectan, confirmar. Aplica `precio_unitario * (1 + pct/100)` a los seleccionados con `update` batch.

## 2.8 Exportar listado a Excel
Botón "Exportar Excel" arriba del listado. Usa `xlsx` (ya disponible en el proyecto por importaciones previas). Exporta los certificados filtrados (respeta los filtros de 1.1) con columnas:
Número, Período, Fecha certificado, Fecha emisión, Tipo, Estado, Subtotal, IVA, Total, Pagado, Saldo, Observaciones.
Nombre archivo: `certificados-{obra}-{yyyyMMdd}.xlsx`.

## Archivos a modificar / crear
- `src/pages/Certificados.tsx` — filtros, KPIs, cards mejoradas, tabla, detalle ampliado, conceptos buscador/edición inline/ajuste %, botón export.
- `src/components/certificados/ConceptosCSVImportDialog.tsx` — nuevo (basado en patrón existente).
- `src/components/certificados/AjustePreciosDialog.tsx` — nuevo (dialog de ajuste por %).
- `src/hooks/useCertificados.ts` — pequeño helper `bulkUpdateConceptosPrice(ids, pct)` y `bulkInsertConceptos(items)`.

## Sin cambios
- Esquema de base de datos (no hace falta nueva columna para esto — `fecha_vencimiento` quedó fuera, era 2.3).
- RLS, edge functions, PDF generator.

## Resultado esperado
Listado filtrable y exportable con KPIs de cobranza claros, cards que muestran progreso de pago de un vistazo, detalle con duplicar/saldo/historial, y una pestaña de Conceptos mucho más rápida de mantener (buscar, editar precio inline, importar masivo, ajustar por %).
