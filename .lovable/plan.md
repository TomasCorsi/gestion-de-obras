

# Detectar obras por número y cliente por número de obra en el importador de Remitos

## Cambios

### 1. `src/pages/Remitos.tsx` - Ampliar `obrasMap` para incluir número de obra

Actualmente `obrasMap` solo mapea `nombre.toLowerCase() -> nombre`. Agregar también el `numero` de la obra como clave:

```typescript
const obrasMap = useMemo(() => {
  const map: Record<string, string> = {};
  obras.forEach(o => {
    map[o.nombre.toLowerCase().trim()] = o.nombre;
    if (o.numero) {
      map[o.numero.toLowerCase().trim()] = o.nombre;
    }
  });
  return map;
}, [obras]);
```

Esto permite que cuando en el CSV el campo "Desde" o "Hasta" tenga un número de obra (ej: "001"), el `matchFromMap` lo encuentre y devuelva el nombre real de la obra.

### 2. `src/pages/Remitos.tsx` - Ampliar `clientesMap` para incluir número de obra como clave → cliente vinculado

Crear un mapa adicional que vincule número de obra con el cliente asociado. Dado que `clientesMap` se pasa como `Record<string, string>`, podemos agregar entradas donde la clave sea el número de obra y el valor sea el nombre del cliente vinculado a esa obra:

```typescript
const clientesMap = useMemo(() => {
  const map: Record<string, string> = {};
  clientes.filter(c => c.activo).forEach(c => {
    map[c.nombre.toLowerCase().trim()] = c.nombre;
  });
  // Agregar lookup por número de obra -> cliente de esa obra
  obras.forEach(o => {
    if (o.numero && o.cliente?.nombre) {
      map[o.numero.toLowerCase().trim()] = o.cliente.nombre;
    }
  });
  return map;
}, [clientes, obras]);
```

Esto permite que si en el CSV el campo "Cliente" tiene un número de obra, se resuelva automáticamente al cliente vinculado a esa obra.

### Sin cambios en `CSVImportDialog.tsx`

La función `matchFromMap` ya hace búsqueda exacta y parcial sobre las claves del mapa, por lo que al agregar las nuevas entradas en los mapas, el matching funciona automáticamente.

