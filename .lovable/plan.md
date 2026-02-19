

## Correcciones en PDF de Certificados

### Problema 1: Mostrar Categoria y Sub Categoria en la tabla de Obra

Actualmente la fila de agrupacion en la tabla de Obra solo muestra la sub categoria (etapa). Se necesita mostrar primero la **Categoria** como encabezado y debajo la **Sub Categoria**.

**Solucion:** En `generateObraPDF`, antes de cada grupo de etapa, determinar la categoria de los items del grupo (usando `categoriaMap`). Si la categoria cambia respecto al grupo anterior, insertar una fila de encabezado de categoria (fondo mas oscuro, texto en mayusculas). La sub categoria se sigue mostrando debajo como hasta ahora.

Ejemplo visual en el PDF:
```text
ALQUILER DE MAQUINAS          <- fila categoria (nueva)
  SEMANA 1                    <- fila sub categoria (existente)
    Camion Tatu PAT AB629IP   <- items
```

### Problema 2: Firma cortada / superpuesta con el footer

En la captura se ve que la firma, el nombre y los datos de empresa se superponen con la linea del footer. Esto ocurre porque `renderFirma` no verifica si hay espacio suficiente antes de renderizar en la posicion actual.

**Solucion:** Antes de renderizar la firma, calcular el espacio necesario (~35mm para imagen + linea + textos). Si `yPos + 35` supera el limite de la pagina (pageHeight - 15mm del footer), agregar una nueva pagina y resetear yPos.

### Resumen de cambios

**Archivo:** `src/utils/generateCertificadoPDF.ts`

| Cambio | Detalle |
|---|---|
| Fila de categoria en tabla Obra | Insertar fila de encabezado por categoria antes de las sub categorias, usando `categoriaMap` para determinar la categoria de cada grupo |
| Fila de categoria en tabla Servicio | Aplicar la misma logica para consistencia (ya agrupa por categoria, se mantiene) |
| Firma con salto de pagina | Agregar verificacion de espacio antes de `renderFirma`. Si no hay espacio, llamar `doc.addPage()` y resetear yPos |
| Firma con salto de pagina | Pasar `margin` a `renderFirma` para poder calcular correctamente |

