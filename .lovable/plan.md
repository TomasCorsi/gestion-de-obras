## Problema

En la cuenta de Franco, la grilla de remitos muestra correctamente la columna **Cli. Cantera** (lee `r.cliente_cantera` directo del registro), pero al abrir el formulario de edición el campo "Cliente" de la sección Cliente Cantera aparece vacío.

## Causa

En `src/pages/Remitos.tsx`, la función `handleEdit` (líneas 202-226) construye el objeto `editingRemito` campo por campo y **omite `cliente_cantera`**. El formulario (`RemitoQuickFormDialog.tsx` línea 179) intenta leer `editingRemito.cliente_cantera`, pero como nunca se pasó, queda como `""`.

## Fix

Una sola línea en `src/pages/Remitos.tsx`, dentro del objeto que pasa `setEditingRemito` en `handleEdit`:

```ts
cliente_cantera: (r as any).cliente_cantera || "",
```

Adicionalmente, verificar el tipo `RemitoEditData` (definido en el mismo archivo o importado) para agregar el campo opcional `cliente_cantera?: string` y evitar el cast `as any`.

## Validación

Entrar como Franco → editar un remito que muestre "PARTICULAR" o "MARCELO GOÑI" en la columna Cli. Cantera → el combobox del formulario debe aparecer precargado con ese valor.
