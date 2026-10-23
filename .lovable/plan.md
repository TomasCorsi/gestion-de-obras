# Contabilidad – Fase 1: maestros, datos fiscales y centros de costo

Alcance: solo propuesta. No se ejecutan migraciones de esta fase hasta tu autorización. Base única: la actual de Lovable Cloud.

## Punto de partida (verificado en la base)
- Hoy hay 64 clientes y 44 proveedores, usados por obras, remitos, órdenes de compra, combustible y rentabilidad.
- Terceros contables: 0 registros. Comprobantes y pagos ya apuntan a esa tabla de terceros.
- Obras: 112. Máquinas: 117. Los asientos ya admiten una obra y una máquina por línea.
- Rentabilidad calcula desde órdenes de compra, combustible, partes, remitos y certificados; no lee asientos.

## 1. Clientes y proveedores (sin duplicar)
- Clientes y proveedores siguen siendo los maestros operativos. No se tocan sus columnas ni sus usos actuales.
- El tercero contable pasa a ser la **ficha fiscal** de cada uno, vinculada al cliente y/o proveedor existente. Una misma empresa que es cliente y proveedor tiene una sola ficha.
- Vinculación inicial asistida: se cruza por CUIT normalizado (solo dígitos). Los casos sin CUIT o con CUIT repetido se listan para revisión manual; no se fusiona nada automáticamente.
- El CUIT normalizado queda único entre las fichas fiscales.

## 2. Datos fiscales
En la ficha fiscal: condición ante IVA (ya existe), tipo y número de documento, condición de IIBB y número, jurisdicción, régimen de ganancias, inscripto en convenio multilateral, exenciones y certificados de no retención con fecha de vigencia, CBU/alias, plazo de pago habitual, cuenta contable por defecto (deudores o proveedores) y código de origen CONTAD.

## 3. Centros y subcentros de costo
- Estructura en dos niveles: **centro** (ej. Obras, Equipos, Administración, Taller) y **subcentro**.
- Cada obra y cada máquina existentes pueden tener **un único** subcentro asociado. Se ofrece crear automáticamente un subcentro por obra activa y por máquina; los inactivos quedan opcionales.
- Al crear una obra o máquina nueva se sugiere su subcentro (sin crearlo de forma silenciosa).
- Código, nombre, activo y fechas de vigencia. Un subcentro con movimientos no se borra, se desactiva.

## 4. Imputaciones múltiples
- **Contable:** sin cambios. Cada asiento puede tener las líneas y cuentas que necesite.
- **Analítica:** cada línea de asiento puede repartirse entre varios subcentros, por importe o porcentaje (ej. 60% Obra A, 40% Obra B).
- Al confirmar un asiento se valida que el reparto de cada línea sume exactamente su importe; si una línea no tiene reparto, toma la obra o máquina que ya tenga cargada (compatibilidad).
- Las reversas copian el reparto en espejo.
- Comprobantes: cada ítem puede llevar su reparto, que viaja al asiento al generarlo.

## 5. Importación de maestros desde CONTAD (preparación)
- Planilla de carga en dos pasos: **subir y revisar**, luego **aplicar**.
- En la revisión cada fila se marca como: nueva, coincide con existente (por CUIT o código CONTAD), conflicto (datos distintos) o inválida.
- Solo se aplican las filas aprobadas. Se guarda el lote, quién lo aplicó y el código CONTAD de cada registro, para poder repetir la importación sin duplicar.
- Esta fase deja lista la estructura y la pantalla de revisión; no se importan datos reales hasta que lo indiques.

## 6. Rentabilidad
No se modifican tablas, cálculos ni pantallas de rentabilidad. Los centros de costo son una vista contable adicional; integrarla con rentabilidad queda para una fase posterior con conciliación explícita.

## 7. Permisos
- Fichas fiscales, centros y repartos: ver y editar admin y contador.
- Importación: preparar admin y contador; aplicar solo admin.
- Usuarios operativos: sin cambios en lo que ven hoy.

## 8. Pantallas (Contabilidad)
- **Terceros:** listado unificado con su cliente/proveedor vinculado, datos fiscales y estado de vinculación.
- **Centros de costo:** árbol centro → subcentro, con obra o máquina asociada.
- **Reparto analítico:** en el detalle del asiento manual y en los ítems de comprobantes.
- **Importar CONTAD:** subir, revisar, aprobar.
- Reporte nuevo: saldos por subcentro y período (solo asientos confirmados).

## Detalles técnicos

Migraciones previstas, una por vez con verificación (todas aditivas, sin borrar ni renombrar):

```text
1A  contab_terceros: + cliente_id (único, FK clientes), proveedor_id (único, FK proveedores),
    cuit_normalizado (generada, índice único parcial), campos fiscales, codigo_contad,
    cuenta_defecto_id. RLS sin cambios (admin/contador).
1B  contab_centros_costo (id, codigo único, nombre, tipo centro|subcentro, padre_id,
    obra_id único nullable, maquinaria_id único nullable, activo, vigencia).
    Check: subcentro exige padre; centro no tiene padre ni obra/máquina.
1C  contab_imputaciones (linea_id FK líneas ON DELETE CASCADE, centro_id FK RESTRICT,
    importe > 0). Guarda de inmutabilidad igual a las líneas (solo en borrador).
    contab_comprobante_item_imputaciones (item_id, centro_id, importe).
    Actualización de contab_confirmar_asiento: validar suma del reparto por línea;
    contab_revertir_asiento: copiar reparto; contab_generar_asiento_cbte: trasladar reparto.
1D  contab_import_lotes y contab_import_filas (datos crudos jsonb, resultado del cruce,
    decisión, registro destino). Función contab_aplicar_lote (solo admin, transaccional).
1E  Funciones auxiliares: sugerir vínculos por CUIT, crear subcentros para obras/máquinas
    seleccionadas (sin ejecución automática).
```

Pruebas por paso: estructura y permisos en modo lectura; reglas con bloques que terminan siempre en vuelta atrás; conteos de clientes, proveedores, obras, máquinas y todas las tablas operativas idénticos antes y después.

## Pendientes heredados del núcleo
- Concurrencia real con dos sesiones simultáneas.
- Ingreso con una sesión real de contador.
- Fechas reales del ejercicio fiscal antes de crear el primer ejercicio.

## Preguntas antes de ejecutar
1. Centros principales que usan hoy (ej. Obras, Equipos, Administración, Taller, otros).
2. ¿Una máquina se imputa siempre a su propio subcentro, o también a la obra donde trabaja ese día?
3. ¿El reparto analítico es obligatorio para cuentas de resultado (ingresos y gastos) o siempre opcional?
4. Formato de exportación de CONTAD para clientes y proveedores (columnas disponibles).
