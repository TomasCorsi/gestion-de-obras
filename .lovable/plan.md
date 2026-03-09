

# No modificar el numero de remito en la importacion

## Problema
Al importar CSV, el campo `numero` se genera como `remito_local + "-" + indice` (ej: `71742-22`), agregando un sufijo innecesario.

## Solucion
En `src/components/remitos/CSVImportDialog.tsx` linea 458, cambiar para que `numero` use directamente el valor de `remito_local` sin agregar nada. Si no hay `remito_local`, generar un ID interno unico.

```
// Antes:
numero = remito_local ? `${remito_local}-${i}` : `IMP-${Date.now()}-${i}`;

// Despues:
numero = remito_local || `IMP-${Date.now()}-${i}`;
```

Un solo cambio, una sola linea.

