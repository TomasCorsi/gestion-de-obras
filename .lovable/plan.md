

## Certificados con Avance Acumulado (Tipo Obra vs Servicio)

### Resumen

Se implementaran dos tipos de certificado seleccionables al crear cada certificado:

- **Tipo Obra**: Incluye columnas de porcentaje anterior, actual, acumulado, avance monetario anterior/actual/acumulado, anticipo configurable, y agrupacion por etapas.
- **Tipo Servicio**: El formato actual simple, sin acumulados.

---

### Cambios en base de datos

**Tabla `certificados`** - Nuevas columnas:
- `tipo` (text, default 'servicio'): 'obra' o 'servicio'
- `anticipo_porcentaje` (numeric, default 0): Porcentaje de anticipo (ej: 15)

**Tabla `certificado_conceptos`** - Nuevas columnas:
- `cantidad_total` (numeric, default 0): Cantidad contratada total del concepto (ej: Tosca 15000 M3)
- `etapa` (text, nullable): Agrupacion por etapa (ej: "ETAPA 2", "ESTACIONAMIENTO"). Distinta de la categoria existente.

**Tabla `certificado_items`** - Nueva columna:
- `etapa` (text, nullable): Para guardar la etapa del item al momento de crear el certificado

---

### Logica de acumulados (solo tipo obra)

Al crear/ver un certificado tipo obra, el sistema:
1. Consulta todos los certificados **anteriores** de la misma obra (por periodo)
2. Para cada concepto, suma las cantidades de certificados previos = **cantidad anterior**
3. La cantidad ingresada en el certificado actual = **cantidad actual**
4. `% anterior = cantidad_anterior / cantidad_total * 100`
5. `% actual = cantidad_actual / cantidad_total * 100`
6. `% acumulado = (cantidad_anterior + cantidad_actual) / cantidad_total * 100`
7. `Avance anterior = cantidad_anterior * precio_unitario`
8. `Avance actual = cantidad_actual * precio_unitario`
9. `Avance acumulado = Avance anterior + Avance actual`
10. Al final: `TOTAL A PAGAR = Avance acumulado total - Anticipo - Total ya certificado anteriormente`

---

### Cambios en la interfaz

**Dialog de Crear/Editar Certificado:**
- Nuevo selector de tipo: "Obra" o "Servicio"
- Si es tipo "Obra":
  - Campo de anticipo (%)
  - La tabla muestra columnas adicionales: Cantidad Total, %Anterior, %Actual, %Acumulado, Avance Anterior, Avance Actual, Avance Acumulado
  - Agrupacion por **etapa** (no por categoria)
  - Al final: linea de Anticipo y TOTAL A PAGAR
- Si es tipo "Servicio": comportamiento actual sin cambios

**Dialog de Ver Certificado:**
- Adapta las columnas segun el tipo del certificado

**Conceptos (tab de gestion):**
- Nuevo campo "Etapa" (opcional) para cada concepto
- Nuevo campo "Cantidad Total" para definir la cantidad contratada

---

### Cambios en el PDF

**PDF tipo Obra** (nuevo layout):
- Encabezado similar al actual
- Tabla con columnas: Concepto, Valor unitario, Cantidad total, Valor total, %anterior, %actual, %acumulado, Avance anterior, Avance actual, Avance acumulado
- Agrupado por etapas
- Fila de TOTAL
- Fila de Anticipo (porcentaje y monto)
- Fila de TOTAL A PAGAR
- Pie de firma

**PDF tipo Servicio**: el PDF actual sin cambios

---

### Detalle tecnico

**Archivos a modificar:**

1. **Migracion SQL**: Agregar columnas `tipo` y `anticipo_porcentaje` a `certificados`, `cantidad_total` y `etapa` a `certificado_conceptos`, `etapa` a `certificado_items`

2. **`src/hooks/useCertificados.ts`**:
   - Actualizar tipos (`Certificado`, `CertificadoConcepto`, `CertificadoItem`, `CertificadoItemForm`) con los nuevos campos
   - Agregar funcion `fetchAcumulados(obraId, periodoActual)` que consulta items de certificados anteriores y calcula cantidades acumuladas por concepto
   - Actualizar `createCertificado` y `updateCertificado` para guardar `tipo`, `anticipo_porcentaje` y `etapa`

3. **`src/pages/Certificados.tsx`**:
   - Selector de tipo al crear certificado
   - Campo de anticipo para tipo obra
   - Tabla expandida con columnas de acumulados para tipo obra
   - Campo de etapa en el dialog de conceptos
   - Campo de cantidad_total en conceptos
   - Vista de certificado adaptada segun tipo

4. **`src/utils/generateCertificadoPDF.ts`**:
   - Bifurcar logica segun `tipo`
   - Nuevo layout de tabla para tipo obra con todas las columnas de avance
   - Seccion de anticipo y total a pagar

**Archivos nuevos:** Ninguno (solo migracion SQL automatica)

