

# Fix: Error al importar remitos

## Problema

Cuando se importan remitos desde CSV, la insercion falla porque el campo `obra_id` se envia como string vacio (`''`), pero la base de datos requiere un UUID valido (columna NOT NULL de tipo UUID). Tambien `material` y `recibido_por` pueden quedar vacios y son NOT NULL.

## Solucion

Agregar un selector de obra obligatorio en el dialogo de importacion, que se aplique a todos los remitos importados. Esto es consistente con el flujo normal donde los remitos se asocian a una obra.

### Cambios

**Archivo: `src/components/remitos/CSVImportDialog.tsx`**

1. Agregar la prop `obras` al componente (lista de obras disponibles)
2. Agregar un estado `selectedObraId` con un selector de obra obligatorio antes del boton de importar
3. Al construir cada `RemitoForm`, asignar `obra_id: selectedObraId` en lugar de `''`
4. Rellenar `recibido_por` con un valor por defecto (ej: `'CSV Import'`) si esta vacio, ya que es NOT NULL
5. Rellenar `material` con el `tipo_material` o un valor por defecto si esta vacio
6. Deshabilitar el boton "Importar" hasta que se seleccione una obra

**Archivo: `src/pages/Remitos.tsx`**

7. Pasar la prop `obras` al componente `RemitosCSVImportDialog` en ambas instancias (linea 339 y 764)

### Detalle tecnico

```text
CSVImportDialog (modificado)
  + prop: obras: { id: string; nombre: string }[]
  + estado: selectedObraId: string
  + UI: Select de obra antes del boton Importar
  + logica: obra_id se toma del selector, no del CSV
  + logica: recibido_por = 'Importacion CSV' si vacio
  + logica: material = tipo_material || 'Sin especificar' si vacio
  + validacion: boton importar deshabilitado sin obra seleccionada
```

En la funcion `handleImport`, antes de llamar `onImport`, se mapean los datos para inyectar el `obra_id` seleccionado:

```typescript
const remitosConObra = parseResult.valid.map(row => ({
  ...row.data,
  obra_id: selectedObraId,
  recibido_por: row.data.recibido_por || 'Importación CSV',
  material: row.data.material || row.data.tipo_material || 'Sin especificar',
}));
await onImport(remitosConObra);
```

Esto resuelve el error de UUID invalido y los campos NOT NULL vacios sin cambiar la estructura de la base de datos.
