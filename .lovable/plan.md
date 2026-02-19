

## Cambios en PDF de Certificados

### 1. Agregar Sub Categoria en la seccion Servicio del PDF

Actualmente `generateServicioPDF` solo agrupa los items por **categoria** (ej: "ALQUILER DE MAQUINAS"). Falta mostrar la **sub categoria** (etapa) debajo de cada categoria, igual que en la seccion Obra.

**Solucion:** Modificar `generateServicioPDF` para:
- Recibir `etapaMap` como parametro adicional
- Dentro de cada grupo de categoria, agrupar los items por sub categoria (etapa)
- Insertar una fila de sub categoria (fondo gris claro, texto indentado) antes de los items de ese grupo
- Si un item no tiene sub categoria, se muestra directamente bajo la categoria

Ejemplo visual:
```text
ALQUILER DE MAQUINAS          <- categoria (existente)
  SEMANA 1                    <- sub categoria (nueva)
    Camion Tatu PAT AB629IP   <- items
  SEMANA 2                    <- sub categoria (nueva)
    Otra maquina              <- items
```

Tambien se debe actualizar la llamada a `generateServicioPDF` en `generateMixtoPDF` y en la funcion principal para pasar el `etapaMap`.

### 2. Eliminar la firma del PDF

Se elimina completamente la llamada a `renderFirma` en la funcion principal `generateCertificadoPDF`. La funcion `renderFirma` se puede dejar en el codigo por si se necesita en el futuro, pero no se invocara.

### Resumen tecnico

**Archivo:** `src/utils/generateCertificadoPDF.ts`

| Cambio | Detalle |
|---|---|
| Sub categoria en Servicio | Modificar `generateServicioPDF` para agrupar por etapa dentro de cada categoria, usando `etapaMap` |
| Firma de `generateServicioPDF` | Agregar parametro `etapaMap` |
| Llamadas a `generateServicioPDF` | Pasar `etapaMap` en `generateMixtoPDF` (linea 618) y en la funcion principal (linea 679) |
| Eliminar firma | Quitar la linea `await renderFirma(doc, pageWidth, yPos)` (linea 695) |
