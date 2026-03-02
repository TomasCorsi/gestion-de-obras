

# Fix Importacion Masiva de Remitos

## Problema

El importador CSV tiene 4 bugs que impiden cargar el archivo correctamente:

1. **Cantidad duplicada**: El alias `cantidad` mapea a la columna "Cantidad total" del CSV, y luego el codigo la multiplica de nuevo por viajes. Ejemplo: fila con 6 viajes y total 162 M3 calcula 162 x 6 = 972 (incorrecto).
2. **Cantidad Uni. ignorada**: No existe un alias separado para "Cantidad Uni.", asi que esa columna nunca se lee. El valor unitario (ej: 27) se pierde.
3. **Patentes compuestas fallan**: Valores como `955-camion-ab 629 jd` solo extraen "955" como codigo. Si no existe, no intenta buscar la patente "ab 629 jd".
4. **Patente no encontrada bloquea la fila**: Se genera un error en vez de un warning, impidiendo importar filas donde la maquinaria no esta en la base de datos.

## Solucion

### Archivo: `src/components/remitos/CSVImportDialog.tsx`

#### 1. Separar aliases de cantidad_uni y cantidad_total

Reemplazar el alias unico `cantidad` por dos claves:

```text
cantidad_uni: ['cantidad uni.', 'cantidad uni', 'cant uni', 'cant. uni.', 'cant uni.']
cantidad_total: ['cantidad total', 'cant total', 'cantidad', 'cant', 'quantity', 'amount']
```

#### 2. Actualizar logica de calculo

```text
// Leer ambas columnas
const cantidadUniRaw = getValue('cantidad_uni');
const cantidadTotalRaw = getValue('cantidad_total');

const effectiveViajes = isNaN(cantidad_viajes) ? 1 : cantidad_viajes;

// Si hay cantidad_total en CSV, usarla directo como total
// Si solo hay cantidad_uni, calcular total = uni * viajes
const cantidad_uni_parsed = cantidadUniRaw ? parseNumber(cantidadUniRaw) : 0;
const cantidad_total_parsed = cantidadTotalRaw ? parseNumber(cantidadTotalRaw) : 0;

const cantidad_uni = cantidad_uni_parsed || (cantidad_total_parsed && effectiveViajes > 0 
  ? cantidad_total_parsed / effectiveViajes : 0);
const cantidad = cantidad_total_parsed || (cantidad_uni_parsed * effectiveViajes);
```

#### 3. Mejorar busqueda de patentes compuestas

En `findMaquinariaId`, despues de intentar por codigo, extraer la patente de formatos como `955-camion-ab 629 jd`:

```text
// Extraer patente de formato compuesto: "955-camion-ab 629 jd"
const parts = trimmed.split('-');
if (parts.length >= 3) {
  const patentePart = parts.slice(2).join('-').trim().toUpperCase();
  const normalizedPatente = patentePart.replace(/[-\s]/g, '');
  if (patentesMap[patentePart]) return patente match;
  if (patentesMap[normalizedPatente]) return patente match;
}
```

#### 4. Cambiar error de patente a warning

Reemplazar el `errors.push` por `warnings.push` cuando la patente no se encuentra, para que la fila se importe igual (sin maquinaria asignada) en vez de ser rechazada.

### Archivos a modificar
1. `src/components/remitos/CSVImportDialog.tsx` -- todos los cambios anteriores

