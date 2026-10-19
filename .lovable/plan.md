# Próximo paso: pruebas de anticipos y rentabilidad + revisión de estabilidad

## Qué se hace
1. **Pruebas de anticipos en cotizaciones**
   - Separar el cálculo del anticipo (por monto o por porcentaje, con decimales y varios anticipos) en una función propia, sin cambiar cómo calcula hoy.
   - Pruebas: el anticipo se descuenta del subtotal antes del IVA; varios anticipos se suman; el porcentaje con decimales (ej. 12,5%) da el importe correcto.
2. **Pruebas de rentabilidad de obra**
   - Separar el cálculo de rentabilidad del tablero (cotizado menos gastos: combustible, órdenes sin IVA, mantenimiento y otros gastos) en una función propia.
   - Pruebas con números concretos, incluyendo que el anticipo cobrado no se sume dos veces a lo cobrado.
3. **Totales de combustible**
   - Revisar que las tarjetas de totales en administración no cuenten los ingresos a cisternas (981 a 984) como consumo; si los cuentan, corregirlo y agregar una prueba.
4. **Guardados que fallan**
   - Revisar los registros de la base de las últimas horas para encontrar qué pantalla genera las operaciones canceladas y corregir la causa si aparece. Si no hay evidencia clara, se informa sin tocar nada.

## Qué no cambia
- No cambian los importes ni cómo se ven las pantallas; solo se ordena el cálculo para poder probarlo.

## Detalles técnicos
- Funciones puras en `src/lib/` (anticipos, rentabilidad), usadas desde `useCotizaciones`, `generateCotizacionPDF` y `useTableroObras`.
- Tests vitest en `src/lib/*.test.ts`, ejecutados con `bun run test`.
- Logs de Postgres vía `supabase--analytics_query`.
- Al terminar: `tsgo` limpio y todas las pruebas en verde.
