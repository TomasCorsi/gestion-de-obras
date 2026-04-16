

## Plan: Repetir encabezados de columna debajo de cada categoría/etapa en el PDF

### Problema
En el PDF exportado de certificados, los títulos de columna (Concepto, Categoría, V.Unit., etc.) solo aparecen una vez arriba de la tabla. Las filas de categoría (EJECUCIÓN DE OBRA) y etapa (GENERAL) aparecen dentro del cuerpo sin que se repitan los encabezados debajo.

### Solución
Insertar una fila de encabezados de columna después de cada fila de categoría y etapa, como una fila del body con estilos similares al header (fondo rojo oscuro, texto blanco, bold).

### Archivo: `src/utils/generateCertificadoPDF.ts`

**En `generateObraPDF` (~líneas 542-616):**
- Después de cada fila de categoría (`currentCategory !== lastCategory`), insertar una fila con los mismos textos del header: `["Concepto", "Categoría", "V. Unit.", "Cant. Tot.", "Cant.", "V. Total", "% Ant.", "% Act.", "% Acum.", "Av. Ant.", "Av. Act.", "Av. Acum.", "Obs."]` con estilos de header (fillColor CORP_DARK_RED, textColor WHITE, bold, fontSize 5.5, halign center)
- Marcar estas filas en `headerRowIndices` para el anti-orphan logic
- Opcionalmente, ocultar el `head:` original del autoTable para que no haya un header duplicado al inicio, o dejarlo como primer encabezado

**En `generateServicioPDF` (~líneas 393-447):**
- Después de cada fila de categoría, insertar fila de encabezados: `["Concepto", "Un.", "Cantidad", "P. Unitario", "Subtotal", "Obs."]` con mismos estilos de header

**En `generateMixtoPDF` (~líneas 694+):**
- Aplicar el mismo patrón en ambas secciones (obra y servicio)

### Resultado visual esperado
```text
┌─────────────────────────────────────────────────┐
│ EJECUCIÓN DE OBRA                               │  ← categoría (gris)
├─────────────────────────────────────────────────┤
│   GENERAL                                       │  ← etapa (gris claro)
├──────────┬──────┬────────┬──────┬──────┬────────┤
│ Concepto │ Cat. │ V.Unit.│ C.T. │ Cant │ ...    │  ← encabezados (rojo)
├──────────┼──────┼────────┼──────┼──────┼────────┤
│ Cunetas  │ Ejec.│$12.000 │358   │358   │ ...    │  ← datos
├──────────┼──────┼────────┼──────┼──────┼────────┤
│ Paviment │ Ejec.│$12.000 │919   │919   │ ...    │  ← datos
└──────────┴──────┴────────┴──────┴──────┴────────┘
```

