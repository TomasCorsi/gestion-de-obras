# Fase 1C — Pantallas de repartos, vínculos y asiento desde comprobante

No se ejecutan migraciones nuevas ni se rediseña SQL. Solo interfaz y pruebas seguras sobre lo ya aplicado (0030).

## Qué se construye

1. **Repartos por ítem (compras y ventas)** — en el formulario del comprobante, cada ítem tiene un panel "Repartos":
   - Modo importe o porcentaje; centro, subcentro, obra, maquinaria.
   - Muestra importe imputado (calculado por la base) y saldo pendiente del ítem.
   - El redondeo lo resuelve la base; la pantalla solo muestra el resultado.

2. **Vínculos operativos por ítem** — selector de órdenes de compra, mantenimientos, combustible, stock, certificados y remitos (viajes, materiales, máquinas).
   - Elección explícita: "Trazabilidad" o "Facturable".
   - Para facturables: importe del documento, ya vinculado y saldo disponible.
   - Deshabilitado para notas de crédito, con aviso: "Disponible cuando exista la vinculación controlada con la factura original".

3. **Asiento desde el comprobante** — botones "Generar asiento borrador" y "Regenerar borrador" (llaman a la función existente, que es idempotente y no duplica imputaciones).
   - Vista de solo lectura del asiento y sus imputaciones; aviso "Las modificaciones se hacen desde el comprobante".

4. **Estados visibles** — insignias separadas: Registrado / Asiento borrador / Contabilizado / Anulado, más el estado financiero aparte (pendiente, parcial, cancelado).

5. **Bloqueos** — si el asiento está confirmado o el comprobante anulado: repartos, vínculos e ítems en solo lectura y botones ocultos. Los errores de la base se muestran traducidos en un aviso.

## Pruebas
- Unitarias: cálculo de saldo pendiente, reglas de habilitación (NC sin vínculos, bloqueo por estado), traducción de mensajes de error.
- **Regresión 1B**: el control de importes fue corregido en `0030_contab_1c_repartos_vinculos.sql` (función guarda de imputaciones: la suma de imputaciones originales no puede superar el importe de la línea). Se agrega una prueba que replica esa regla y un test transaccional que se deshace al final, sin dejar datos.
- Flujo desde la pantalla con Playwright (admin) **sin persistencia**: las escrituras se interceptan en el navegador y se responden simuladas; se verifican formularios, estados, bloqueos y mensajes de error. No se crean comprobantes de prueba en producción.
- Validación de base: bloques transaccionales con ROLLBACK (repartos, vínculos, generar/regenerar sin duplicar).

## Ajustes incorporados
- **Guardado consistente**: un comprobante nuevo y sus ítems se guardan primero; repartos y vínculos se habilitan recién cuando el guardado terminó bien. Si falla, se informa el error y no se avanza.
- **Filtro de documentos**: vínculos filtrados por compra/venta, cliente/proveedor del comprobante y saldo disponible; la base sigue siendo la validación final.
- Imputaciones de asientos de comprobantes siempre en solo lectura; repartos editables y regeneración solo con asiento en borrador.
- Importes y porcentajes mostrados son los que devuelve la base. No se crean subcentros automáticamente.
- Recuperación: queda pendiente, sin ejecutar en la base productiva.

## Fuera de alcance
Módulos operativos, rentabilidad, CONTAD, 1D, otra base.

## Detalle técnico
- Nuevos: `src/hooks/useContabRepartos.ts`, `src/hooks/useContabVinculos.ts`, `src/components/contabilidad/RepartosItemPanel.tsx`, `VinculosItemPanel.tsx`, `AsientoComprobanteView.tsx`, `src/lib/contab1c.ts` + `contab1c.test.ts`.
- Editados: `ComprobanteDialog.tsx`, `ComprobantesTab.tsx`, `src/lib/contabEstados.ts`.
- Saldos de documentos operativos se leen con selects de columnas específicas (subtotal, costo_total, etc.), sin modificar esas tablas.
- Informe final breve con lo probado y lo pendiente.
