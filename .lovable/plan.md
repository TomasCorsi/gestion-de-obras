

## Plan: Recalcular clientes origen/destino en remitos existentes

### Problema
Remitos viejos tienen `cliente` y `cliente_destino` incorrectos o vacíos porque fueron creados antes de la lógica de auto-clasificación.

### Solución
Agregar un botón "Recalcular Clientes" en la página de Remitos que ejecute la misma lógica de `getClienteForObra` sobre todos los remitos, actualizando `cliente` (desde el campo `desde`) y `cliente_destino` (desde el campo `hasta`).

### Cambios

**1. `src/pages/Remitos.tsx`**
- Agregar botón "Recalcular Clientes" en la barra de acciones (junto a Importar/Exportar)
- Implementar función `handleRecalcularClientes`:
  - Recorre todos los remitos
  - Para cada remito, busca la obra que coincida con `desde` → obtiene el cliente si es obra externa (N° >= 300)
  - Igual con `hasta` → `cliente_destino`
  - Compara con los valores actuales; solo actualiza los que cambiaron
  - Usa `batchSave` con los updates necesarios
  - Muestra toast con cantidad de remitos actualizados
- La lógica de matching es: buscar obra por nombre, verificar si `numero >= 300` (externa), y usar `obra.cliente?.nombre`

**2. `src/hooks/useRemitos.ts`**
- Sin cambios — ya tiene `batchSave` con updates en paralelo

### Lógica de recálculo
```text
Para cada remito:
  obra_desde = obras.find(o => o.nombre === remito.desde)
  cliente_nuevo = obra_desde && numero >= 300 ? obra_desde.cliente.nombre : ""
  
  obra_hasta = obras.find(o => o.nombre === remito.hasta)  
  cliente_destino_nuevo = obra_hasta && numero >= 300 ? obra_hasta.cliente.nombre : ""
  
  Si cambió alguno → agregar a lista de updates
```

### Archivos a editar
- `src/pages/Remitos.tsx` — botón + función de recálculo

