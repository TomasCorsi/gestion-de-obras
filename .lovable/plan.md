# Contabilidad – Fase 1 (sin migración de CONTAD) y diseño técnico de 1A

Alcance: propuesta para revisar. No se ejecuta ninguna migración hasta tu autorización. Base única: la actual de Lovable Cloud.

## Decisión de base
- **No se importa nada de CONTAD**: ni clientes, ni proveedores, ni comprobantes, asientos o movimientos. CONTAD queda solo para consultar lo histórico.
- La contabilidad del ERP arranca desde cero en una **fecha de corte** que definirán ustedes. Hasta esa fecha se consulta CONTAD; desde esa fecha todo se registra solo en el ERP.
- No se agrega ningún código de CONTAD a las tablas nuevas.
- Se reutilizan solo los clientes, proveedores, obras y máquinas que ya existen en el ERP.
- No se modifican obras, maquinaria, combustible, remitos, certificados, stock ni rentabilidad.

## Punto de partida (verificado en la base)
- Clientes: 64, de los cuales **59 no tienen CUIT** y 5 tienen CUIT válido.
- Proveedores: 44, de los cuales 25 no tienen CUIT y 19 tienen CUIT válido.
- No hay CUIT repetidos dentro de clientes ni dentro de proveedores, y ningún CUIT figura a la vez como cliente y proveedor.
- Fichas fiscales: 0. Comprobantes y pagos contables ya apuntan a esa tabla.
- Conclusión: el cruce automático por CUIT alcanza para pocos casos. La vinculación será principalmente **manual y asistida**, a medida que se use cada cliente o proveedor.

## Fase 1 – alcance actualizado
- **1A. Fichas fiscales vinculadas** a clientes y proveedores existentes (detalle abajo).
- **1B. Centros y subcentros de costo**, con subcentros vinculados a obras y máquinas existentes (un subcentro por obra o máquina como máximo).
- **1C. Imputaciones múltiples**: cada línea de asiento y cada ítem de comprobante puede repartirse entre varios subcentros. Al confirmar, el reparto debe sumar exactamente el importe; sin reparto toma la obra o máquina ya cargada.
- **1D. Apertura y fecha de corte** (reemplaza a la antigua 1D de importación):
  - Configuración única de la **fecha de inicio del ERP**. No se pueden confirmar asientos ni comprobantes anteriores a esa fecha, salvo el asiento de apertura.
  - **Asiento de apertura** opcional y manual, hecho con el asiento manual que ya existe (tipo Apertura), fechado el día de inicio. Uno solo por ejercicio.
  - **Saldos iniciales por cliente o proveedor**, cargados a mano y opcionales, como detalle del asiento de apertura: tercero, comprobante de referencia, fecha, vencimiento e importe. Sirven para que las cuentas corrientes nuevas arranquen con el saldo aprobado por el contador.
  - Detalle opcional de cheques en cartera y anticipos dentro de la apertura.
  - Solo admin y contador; la apertura se confirma como cualquier asiento y queda auditada. No es un importador: no hay carga masiva de archivos.

## 1A – Fichas fiscales: qué cambia para el usuario
- Nueva pantalla **Contabilidad → Terceros**: lista todos los clientes y proveedores del ERP con su estado: "con ficha fiscal" o "sin ficha".
- Desde ahí se crea la ficha de un cliente o proveedor existente. Los datos que ya tienen (nombre, CUIT, domicilio, teléfono, email) se copian como punto de partida.
- Si una empresa es cliente y también proveedor, se vincula a **una sola ficha**. El sistema sugiere la coincidencia cuando el CUIT es igual, pero no fusiona nada solo.
- Al cargar una factura de compra o venta se elige el cliente o proveedor de siempre. Si todavía no tiene ficha, se ofrece crearla en el momento.
- No se pueden registrar dos fichas con el mismo CUIT.
- Los clientes y proveedores operativos no cambian: se siguen editando donde se editan hoy.

### Datos fiscales de la ficha
Razón social, CUIT, condición ante IVA (ya existe), condición y número de Ingresos Brutos, jurisdicción, convenio multilateral, régimen de Ganancias, exenciones o certificados de no retención con vigencia, CBU y alias, banco, plazo de pago habitual y cuenta contable por defecto (deudores o proveedores).

## Detalles técnicos de 1A

Una sola migración aditiva: no borra ni renombra nada y no toca las tablas `clientes` ni `proveedores`.

```sql
ALTER TABLE public.contab_terceros
  ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE RESTRICT,
  ADD COLUMN proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE RESTRICT,
  ADD COLUMN cuit_normalizado text GENERATED ALWAYS AS (NULLIF(regexp_replace(COALESCE(cuit,''),'\D','','g'),'')) STORED,
  ADD COLUMN iibb_condicion text,          -- local | convenio | exento | no_inscripto
  ADD COLUMN iibb_numero text,
  ADD COLUMN iibb_jurisdiccion text,
  ADD COLUMN ganancias_regimen text,
  ADD COLUMN exencion_detalle text,
  ADD COLUMN exencion_vigencia_hasta date,
  ADD COLUMN cbu_alias text,
  ADD COLUMN plazo_pago_dias integer,
  ADD COLUMN cuenta_defecto_id uuid REFERENCES public.contab_plan_cuentas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_terc_iibb CHECK (iibb_condicion IS NULL OR iibb_condicion IN ('local','convenio','exento','no_inscripto')),
  ADD CONSTRAINT chk_terc_plazo CHECK (plazo_pago_dias IS NULL OR plazo_pago_dias BETWEEN 0 AND 365),
  ADD CONSTRAINT chk_terc_cuit CHECK (cuit_normalizado IS NULL OR length(cuit_normalizado) = 11);

CREATE UNIQUE INDEX uq_contab_terc_cliente   ON public.contab_terceros (cliente_id)   WHERE cliente_id IS NOT NULL;
CREATE UNIQUE INDEX uq_contab_terc_proveedor ON public.contab_terceros (proveedor_id) WHERE proveedor_id IS NOT NULL;
CREATE UNIQUE INDEX uq_contab_terc_cuit      ON public.contab_terceros (cuit_normalizado) WHERE cuit_normalizado IS NOT NULL;
```

Coherencia entre `tipo` y los vínculos, mediante un trigger de validación:
- Con `cliente_id` cargado, `tipo` debe ser cliente o ambos.
- Con `proveedor_id` cargado, `tipo` debe ser proveedor o ambos.
- Al vincular los dos, `tipo` pasa a ambos.
- No se puede desvincular un cliente o proveedor si la ficha ya tiene comprobantes o pagos asociados.

Funciones (con permisos de sistema, solo admin y contador, con `contab_puede`):
- `contab_ficha_desde_maestro(_cliente_id uuid, _proveedor_id uuid)`: crea la ficha copiando los datos existentes, o devuelve la que ya existe. Si el CUIT ya está en otra ficha, la sugiere en lugar de duplicarla.
- `contab_vincular_ficha(_tercero_id uuid, _cliente_id uuid, _proveedor_id uuid)`: une una ficha existente con el otro maestro.
- Vista de solo lectura `contab_terceros_estado`, que une clientes y proveedores con su ficha (sí/no, CUIT y sugerencia de coincidencia por CUIT). Se crea con permisos del usuario que la consulta (`security_invoker`): admin y contador la ven completa; el resto no ve las fichas.

Permisos: no cambian los de la tabla de fichas (ver y editar admin y contador). Los usuarios operativos siguen sin acceso.

Aplicación:
- Hook `useTercerosEstado` y pestaña "Terceros" en Contabilidad.
- En el formulario de comprobantes, el selector de tercero usa la vista y ofrece "crear ficha" si falta.

Verificación del paso:
- Solo lectura: columnas, índices, restricciones y permisos.
- Pruebas que siempre se deshacen al final: crear ficha desde cliente, vincular el mismo CUIT como proveedor, rechazar CUIT duplicado, rechazar desvincular con comprobantes, y probar como usuario sin acceso.
- Antes y después: conteos de clientes, proveedores, obras y del resto de las tablas operativas, idénticos.

Vuelta atrás: quitar el trigger, las funciones, la vista, los índices y las columnas nuevas, solo si no hay fichas con vínculos. Se ejecuta únicamente con tu aprobación.

## Pendientes heredados
- Concurrencia real con dos sesiones simultáneas.
- Ingreso con una sesión real de contador.
- Fechas reales del ejercicio fiscal y fecha de corte del ERP.

## Preguntas antes de 1B y 1C (no bloquean 1A)
1. Centros principales que usan hoy (ej. Obras, Equipos, Administración, Taller).
2. ¿Una máquina se imputa a su propio subcentro, a la obra donde trabaja o a ambos?
3. ¿El reparto analítico es obligatorio para las cuentas de ingresos y gastos, o siempre opcional?
