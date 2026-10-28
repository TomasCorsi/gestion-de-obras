# Pantalla en blanco
## Remitos de máquinas
- [x] Carga, edición y Excel de varias máquinas en un remito; guardado y edición de dos renglones verificados con sesión real, pruebas aprobadas.

- [x] Recuperación visible ante fallos de carga y reintento verificados en navegador.
- [x] Reemplazo de limpieza en `/sw.js`; dos pruebas pasan y no se registra caché nuevo.
- [x] Acceso con sesión verificado en Partes Diarios; sin errores de compilación.
- [ ] Publicación y comprobación en el Android afectado: requieren publicación del usuario y prueba en ese teléfono. La limpieza pausa temporalmente offline y push; conserva icono y borradores.- [x] Empleados (maquinista/chofer) veían "No se pudo abrir la aplicación": canal de documentos duplicado; corregido y verificado simulando maquinista.
- [ ] Publicar y confirmar en celulares de empleados (requiere publicación del usuario).

- [ ] Contabilidad Fase 0A: validar en borrador aislado (plan en .lovable/plan.md); producción intacta. Bloqueado: crear borrador en el próximo mensaje.

## Contabilidad – verificaciones operativas pendientes (núcleo 0A–0C)
- [ ] Concurrencia real: dos usuarios confirmando asientos / cerrando período a la vez (numeración sin huecos ni duplicados). Bloqueo: requiere dos sesiones simultáneas reales.
- [ ] Ingreso con sesión real de contador (hoy no existe usuario con rol contador). Bloqueo: asignar el rol a la persona real.
- [ ] Confirmar/Revertir desde la pantalla con datos reales (probado solo en transacción revertida).
- [ ] Fechas reales del ejercicio fiscal de Calamina Sur antes de crear el primer ejercicio (no crear 2026 automáticamente).

## Contabilidad 1B (centros de costo) — aplicada
- [x] Tablas, validaciones, 6 centros iniciales, pantalla e imputación por línea
- [ ] Pendiente: prueba de concurrencia real con dos sesiones (no se ejecuta en base productiva)
- [ ] Pendiente: prueba con sesión real de contador (no existe usuario contador)
- [ ] Pendiente 1A: corregir CUIT inválidos de terceros usados; usar cuenta específica por cliente/proveedor al generar asientos
- [ ] Pendiente: definir con el contador qué cuentas exigen imputación analítica obligatoria

## Contabilidad 1C — pantallas
- [x] Repartos por ítem, vínculos operativos, generar/regenerar borrador, etapas y bloqueos
- [x] Regresión 1B (control de importes, corregido en 0030)
- [ ] Prueba de recuperación de funciones (bloqueada: falta forma segura de validarla fuera de producción)
- [ ] Vínculos de notas de crédito con factura original
- [ ] Sesión real de contador y concurrencia real
