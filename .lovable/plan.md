
# Fix: Novedades se borra al guardar como borrador

## Problema

En `buildParteData()` (linea 251 de `ParteDiarioFormView.tsx`), el campo `novedades` solo se guarda cuando el rol es **capataz**:

```
novedades: isCapataz ? formData.novedades || null : null,
```

Pero el campo se muestra para **capataz** y **repartidor_calecita** (linea 154):

```
const showNovedades = isCapataz || isRepartidorCalecita;
```

Resultado: para repartidor_calecita (y cualquier otro rol que vea el campo), `novedades` siempre se envia como `null` a la base de datos, borrando lo escrito.

## Solucion

Cambiar la condicion en `buildParteData()` para usar `showNovedades` en vez de `isCapataz`:

**Archivo:** `src/components/parte-diario/ParteDiarioFormView.tsx`

**Linea 251** - Cambiar:
```
novedades: isCapataz ? formData.novedades || null : null,
```
Por:
```
novedades: showNovedades ? formData.novedades || null : null,
```

Este cambio de una sola palabra asegura que cualquier rol que vea el campo "Novedades" tambien lo guarde correctamente en la base de datos.
