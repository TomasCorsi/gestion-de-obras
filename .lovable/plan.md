

## Cambios en formulario de certificados y PDF

### 1. Formulario de creacion/edicion (Certificados.tsx)

**Mostrar Categoria y Sub Categoria juntas en los encabezados de grupo:**

Actualmente en el modo Obra, el grupo muestra solo la etapa (sub categoria). Se cambia para mostrar "Categoria > Sub Categoria" cuando ambos valores existen.

- En la seccion **Obra**: el header del grupo pasara de mostrar solo `{group.etapa}` a mostrar `{categoria} > {group.etapa}` (tomando la categoria del primer item del grupo).
- En la seccion **Mixto Obra**: idem, el header mostrara ambos valores.
- En la seccion **Servicio** y **Mixto Servicio**: ya agrupa por categoria, y dentro muestra sub categorias. Se mantiene igual ya que la estructura Categoria > Sub Categoria ya esta visible.

### 2. Cambios en el PDF (generateCertificadoPDF.ts)

#### a) Quitar titulos de seccion en Mixto
- Eliminar el banner rojo "SECCION OBRA -- Avance Acumulado" (lineas 580-588)
- Eliminar el banner gris "SECCION SERVICIO -- Precio x Cantidad" (lineas 594-604)

#### b) Quitar prefijo "SUB CATEGORIA:" en la tabla de Obra
- Linea 470: cambiar `"SUB CATEGORÍA: " + etapaName.toUpperCase()` a solo `etapaName.toUpperCase()`

#### c) Mostrar la categoria en los datos
- En la tabla de Obra, ya existe la columna "Categoria" que muestra la categoria de cada item. Se mantiene.
- En las filas de agrupacion por sub categoria, agregar la categoria como contexto si es distinta entre sub categorias.

#### d) Mover totales al final de todo en Mixto
- Actualmente `generateMixtoPDF` llama a `generateObraPDF` y `generateServicioPDF`, y cada uno renderiza sus propios totales al final.
- Se cambia para que en modo Mixto, los totales de cada seccion NO se rendericen inline, y en su lugar se muestre un unico bloque de totales al final de `generateMixtoPDF` con el resumen completo.
- Para lograr esto, se crearan variantes de `generateObraPDF` y `generateServicioPDF` que reciban un parametro `skipTotals` para omitir el bloque de totales, y luego `generateMixtoPDF` renderiza los totales unificados al final.

### Resumen tecnico de archivos

| Archivo | Cambio |
|---|---|
| `src/pages/Certificados.tsx` | Mostrar "Categoria > Sub Categoria" en headers de grupo para Obra y Mixto Obra |
| `src/utils/generateCertificadoPDF.ts` | Quitar banners de seccion en Mixto; quitar prefijo "SUB CATEGORIA:"; mover totales al final en Mixto |

