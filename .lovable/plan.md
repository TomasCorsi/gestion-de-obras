# Cargar el Plan de Cuentas de CONTAD como plan definitivo del ERP

## Qué contiene el archivo
- 306 cuentas de Calamina Sur S.A., con códigos de 6 dígitos (100000 Activo ... 421410 Infracciones Vehículos).
- 247 imputables y 59 agrupadoras (títulos), con cuenta madre y rubro.
- Clasificación: Activo 152, Pasivo 44, Patrimonio Neto 15, Resultados Positivos 13, Resultados Negativos 82.
- 87 cuentas marcadas con Centro de Costo obligatorio.
- Columna "Mon." (S / N / X) en 306 cuentas.
- Sin códigos repetidos.

## Situación actual del ERP
- Hay un plan base provisorio de 79 cuentas (51 imputables).
- No hay asientos, comprobantes ni ejercicios cargados, así que se puede reemplazar sin afectar datos.
- 9 cuentas automáticas (IVA, proveedores, clientes, etc.) apuntan hoy al plan provisorio.

## Qué se va a hacer
1. Importar las 306 cuentas con el mismo código, nombre, jerarquía y clasificación que en CONTAD.
2. Marcar como "analítica obligatoria" las 87 cuentas con C.C. = S, para que el ERP exija centro de costo al usarlas.
3. Dar de baja (inactivar, no borrar) las 79 cuentas provisorias.
4. Reasignar las 9 cuentas automáticas a sus equivalentes del plan CONTAD; las que no tengan equivalente claro quedan en una lista para que el contador las confirme.
5. Mostrar el plan en Contable > Plan de Cuentas con la estructura de árbol de CONTAD.
6. Prueba automática: totales por tipo, imputables, jerarquía completa y cuentas con centro de costo.

Solo se importa la estructura del plan: no se cargan saldos, movimientos ni datos históricos de CONTAD.

## Para confirmar con el contador
- Qué significa la columna "Mon." (S/N/X): ¿moneda extranjera o cuenta monetaria para ajuste por inflación? Se guarda tal cual hasta saberlo.
- Equivalencias de las cuentas automáticas (IVA crédito/débito, percepciones, proveedores, clientes, caja/bancos).
- Se corregirán errores de tipeo visibles ("Secundiaria", "Imouesto") solo si lo aprobás; si no, se copian exactos.

## Detalle técnico
- Un único cambio de base para preparar el plan (marcar analítica obligatoria y la categoría "Mon." si hace falta un campo nuevo); las cuentas se cargan como datos, en una sola transacción.
- Se mapean AC/PS/PN/RP/RN a activo/pasivo/patrimonio/ingreso/egreso; cuenta madre → cuenta padre por código.
- Las validaciones del plan provisorio (bloqueos de cuenta con movimientos, imputable vs. agrupadora) siguen siendo responsabilidad de la base.
