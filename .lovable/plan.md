

## Certificados: Categorias por tipo y exportacion PDF profesional

### Resumen
Se van a agregar dos mejoras al modulo de certificados:
1. **Categorias**: Los conceptos se van a poder agrupar por tipo (ej: "Alquiler de Maquinas", "Materiales", "Servicios"), y en el certificado se van a mostrar separados por seccion con subtotales por categoria.
2. **PDF profesional**: Se va a poder descargar un PDF detallado y con formato corporativo (logo, datos de empresa, tabla agrupada por categorias, totales, firma) listo para entregar al cliente.

---

### Cambios en la base de datos

**Agregar columna `categoria` a `certificado_conceptos`:**

```text
ALTER TABLE public.certificado_conceptos 
  ADD COLUMN categoria text NOT NULL DEFAULT 'General';
```

Categorias predefinidas que se van a usar:
- Alquiler de Maquinas
- Materiales
- Servicios
- Transporte
- General (default)

No se necesita tabla nueva para categorias -- se usa texto libre con sugerencias predefinidas para mantener simplicidad.

---

### Cambios en el frontend

**1. Hook `useCertificados.ts`:**
- Agregar `categoria` al tipo `CertificadoConcepto` y `ConceptoForm`
- Agregar `categoria` al tipo `CertificadoItemForm` y `CertificadoItem`
- Actualizar `CONCEPTOS_ESTANDAR` para incluir categoria sugerida por cada concepto (ej: "Horas Retroexcavadora" -> "Alquiler de Maquinas", "Tosca" -> "Materiales")

**2. Pagina `Certificados.tsx`:**
- En el tab de **Conceptos**: agregar selector de categoria al crear/editar un concepto, y mostrar la categoria en la tabla de conceptos
- En el dialog de **Crear Certificado**: agrupar los items por categoria con sub-encabezados y subtotales por seccion
- En el dialog de **Ver Certificado**: agrupar items por categoria igual que en la creacion, y agregar boton "Descargar PDF"

**3. Nuevo archivo `src/utils/generateCertificadoPDF.ts`:**
- Genera un PDF A4 profesional con jsPDF + jspdf-autotable (mismas librerias ya instaladas)
- Estructura del PDF:
  - Encabezado con logo de empresa, datos de la empresa y CUIT
  - Titulo: "CERTIFICADO DE OBRA" con numero y periodo
  - Datos de la obra (nombre, ubicacion)
  - Tabla de items agrupados por categoria con sub-encabezados grises
  - Subtotal por categoria
  - Subtotal general, IVA 21%, y TOTAL destacado
  - Observaciones (si las hay)
  - Firma y datos del presidente
- Reutiliza las mismas imagenes (logo y firma) y patrones del PDF de cotizaciones existente

---

### Detalle tecnico

**Categorias predefinidas (constante en el hook):**

```text
CATEGORIAS_CERTIFICADO = [
  "Alquiler de Maquinas",
  "Materiales", 
  "Transporte",
  "Servicios",
  "General"
]
```

**Mapeo de conceptos estandar a categorias:**

| Concepto | Categoria |
|---|---|
| Horas Retroexcavadora, Horas Cargadora, Horas Topador, Horas Motoniveladora, Alquiler Maquina por dia | Alquiler de Maquinas |
| Gasoil | Servicios |
| Tosca, Tierra, Cascote, Piedra, Fresado, Suelo Cemento | Materiales |
| Cunetas | Servicios |
| Viajes | Transporte |

**Estructura del PDF:**

```text
+------------------------------------------+
| [LOGO]              CALAMINA SUR S.A.    |
|                     CUIT / Direccion      |
|------------------------------------------|
| CERTIFICADO DE OBRA Nro: CERT-001        |
| Periodo: Enero 2026                      |
| Obra: [nombre]  |  Ubicacion: [ubicacion]|
|------------------------------------------|
| ALQUILER DE MAQUINAS                     |
|  Concepto  | Un | Cant | P.U. | Subtotal |
|  Hs Retro  | HR |  40  | $X   | $X       |
|  Hs Carg   | HR |  20  | $X   | $X       |
|             Subtotal Alquiler:    $X      |
|------------------------------------------|
| MATERIALES                               |
|  Tosca     | M3 |  100 | $X   | $X       |
|             Subtotal Materiales:  $X      |
|------------------------------------------|
|                        Subtotal:  $X      |
|                        IVA 21%:   $X      |
|                        TOTAL:     $X      |
|------------------------------------------|
| [Firma]                                  |
| CALAMINA SUR S.A. - Gabriel Tognini      |
+------------------------------------------+
```

### Archivos a modificar/crear
1. **Migracion SQL** - agregar columna `categoria` a `certificado_conceptos`
2. **`src/hooks/useCertificados.ts`** - tipos, constantes, categoria en forms
3. **`src/pages/Certificados.tsx`** - UI con agrupacion por categoria + boton PDF
4. **`src/utils/generateCertificadoPDF.ts`** - nuevo archivo para generar el PDF

