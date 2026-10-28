# Fase 1D: operación paralela y preparación del próximo ejercicio

## Fechas
- **Ejercicio fiscal actual:** 01/08/2026 al 31/07/2027. Lo lleva CONTAD, que es el sistema oficial.
- **Inicio de la operación paralela:** 01/11/2026, a confirmar con el contador.
- **Inicio oficial del ERP:** 01/08/2027, con el ejercicio 01/08/2027 al 31/07/2028.

## Situación actual de la base (relevada hoy)
- No hay ejercicios, períodos, asientos, comprobantes ni pagos cargados.
- Los datos fiscales de la empresa están vacíos.
- El plan de cuentas es el base, de 79 cuentas, y todavía no lo validó el contador.
- Ya existen las pantallas de compras, ventas, pagos, cobranzas, asientos, Libro Diario, Mayor, Sumas y Saldos, IVA Compras y Ventas, centros de costo y ejercicios.
- Siguen como "Próximamente": cuentas corrientes y totales de clientes y proveedores, Libro Banco, retenciones y percepciones.

## 1. Qué hay que implementar para activar el modo paralelo
1. **Marcar un ejercicio como paralelo o como oficial.**
   - Se crea, cuando lo apruebes, un ejercicio de prueba del 01/11/2026 al 31/07/2027, marcado "paralelo", con sus períodos mensuales.
   - El ejercicio 2027/28 se va a crear después, marcado "oficial".
2. **Advertencia fija** en todas las pantallas de Contabilidad mientras haya un ejercicio paralelo activo: "Modo paralelo — CONTAD continúa siendo el sistema contable oficial hasta el 31/07/2027."
   - La misma leyenda aparece en el encabezado de los libros y reportes que se exportan o imprimen, para que nadie los tome como oficiales.
3. **Bloqueo de fechas anteriores** al inicio de la operación paralela: la base rechaza comprobantes, pagos y asientos con fecha previa.
4. **Datos fiscales de la empresa y validación del plan de cuentas.** Se cargan una vez y sirven también para el ejercicio oficial.
5. **El ejercicio paralelo queda aislado.** Sus saldos no pasan al ejercicio oficial y no generan asiento de apertura.

No se migran datos de CONTAD, ni saldos ni cuentas corrientes.

## 2. Qué controles se pueden probar entre noviembre y julio
- Compras, ventas, notas de crédito y su IVA. Se cruzan cada mes contra los Libros IVA de CONTAD.
- Pagos y cobranzas de las operaciones nuevas cargadas en el ERP.
- Repartos por centro y subcentro de costo, y los vínculos con obras y máquinas.
- Asientos automáticos y manuales, su numeración, la reversa y que no se puedan editar una vez confirmados.
- Libro Diario, Mayor y Sumas y Saldos: que cuadren y que se pueda seguir cada asiento hasta su comprobante.
- Cierre mensual de períodos, el bloqueo de períodos cerrados y la reapertura solo por un administrador.
- Permisos de cada rol trabajando con usuarios reales.

**Comparación mensual sugerida:** IVA de compras y ventas del ERP contra CONTAD, para las mismas operaciones del mes. Se hace fuera del sistema y no se carga nada de CONTAD en el ERP.

## 3. Qué falta construir para llegar seguros al 01/08/2027
1. Cuentas corrientes y totales de clientes y proveedores.
2. Libro Banco y conciliación bancaria.
3. Retenciones y percepciones, emitidas y sufridas.
4. El circuito completo de las notas de crédito, incluidos sus vínculos.
5. El cierre del ejercicio: asiento de refundición de resultados y bloqueo del ejercicio.
6. El asiento de apertura del ejercicio oficial, con un asistente que controle que debe y haber cierren y que se confirme una sola vez.
7. Las exportaciones legales que pida el contador: Libro Diario, IVA Digital y otras.
8. Las pruebas pendientes: con un usuario contador real, en celular y con varios usuarios trabajando a la vez.

Estas piezas se planifican como fases separadas.

## 4. Qué queda para el cierre del 31/07/2027
- El cierre definitivo de CONTAD y la validación de los saldos finales, a cargo del contador.
- La creación del ejercicio oficial 2027/28 en el ERP.
- El asiento de apertura del ejercicio oficial con los saldos validados de CONTAD, cargados como totales por cuenta.
- Qué hacer con el ejercicio paralelo: archivarlo como prueba o descartarlo.
- El tratamiento de los comprobantes de clientes y proveedores que sigan abiertos. Se decide en ese momento, según cuántos queden.
- Desactivar el modo paralelo. Desde el 01/08/2027, el ERP pasa a ser el sistema oficial.

## Qué hay que definir con el contador
1. Que confirme el 01/11/2026 como inicio de la operación paralela.
2. Los datos fiscales de la empresa y los puntos de venta.
3. La validación del plan de cuentas, con una cuenta por cada banco y cada caja, y qué cuentas exigen obra o máquina.
4. Qué controles mensuales quiere comparar contra CONTAD y quién los revisa.
5. Las exportaciones legales que va a necesitar desde agosto de 2027.

## Detalle técnico (implementación posterior)
- Una migración chica, sin tocar lo que ya hacen 1A, 1B y 1C:
  - En `contab_ejercicios` se agregan las columnas `modo` ('paralelo' u 'oficial', por defecto 'oficial') y `fecha_inicio_operacion`.
  - Un trigger de fecha mínima en comprobantes, pagos y asientos.
  - Una función que avisa si hay un ejercicio paralelo activo.
- En las pantallas se agrega una sola advertencia fija en la pantalla de Contabilidad, y una leyenda en los encabezados de PDF y Excel de libros y reportes.
- No cambian la navegación, los módulos operativos ni la rentabilidad. El ejercicio paralelo no se crea hasta que lo apruebes.
