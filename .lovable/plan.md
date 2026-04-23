

## Re-generar masivamente Cli. Origen y Cli. Destino en Remitos

### Diagnóstico
En BD hay **519 remitos** y faltan datos de cliente:
- **322 remitos** tienen `desde` cargado pero `cliente` vacío.
- **179 remitos** tienen `hasta` cargado pero `cliente_destino` vacío.

El formulario completa estos campos automáticamente buscando la obra por nombre y tomando su cliente asociado (`obras.cliente_id → clientes.nombre`). Cuando se cargaron remitos con obras que **aún no tenían cliente asignado**, los campos quedaron vacíos. Ahora que muchas obras ya tienen cliente, podemos repoblar de una sola vez.

### Cambio único: migración de datos (UPDATE masivo)

Una sola sentencia SQL vía la herramienta de inserción de datos:

```sql
-- Rellenar cliente (origen) cuando esté vacío y la obra "desde" tenga cliente
UPDATE remitos r
SET cliente = c.nombre
FROM obras o
JOIN clientes c ON c.id = o.cliente_id
WHERE (r.cliente IS NULL OR r.cliente = '')
  AND r.desde IS NOT NULL AND r.desde <> ''
  AND o.nombre = r.desde;

-- Rellenar cliente_destino cuando esté vacío y la obra "hasta" tenga cliente
UPDATE remitos r
SET cliente_destino = c.nombre
FROM obras o
JOIN clientes c ON c.id = o.cliente_id
WHERE (r.cliente_destino IS NULL OR r.cliente_destino = '')
  AND r.hasta IS NOT NULL AND r.hasta <> ''
  AND o.nombre = r.hasta;
```

### Detalles importantes
- **No pisa datos existentes**: solo actualiza filas donde el cliente está nulo o vacío. Los remitos que ya tienen cliente cargado a mano se respetan.
- **Match exacto por nombre de obra** (igual lógica que `getClienteForObra` del formulario).
- Las obras que **siguen sin cliente asignado** (Campo el Tatu, Espacio Nova, Moreno, etc.) seguirán dejando el remito vacío hasta que se les cargue cliente.
- Los textos libres en `desde`/`hasta` que no coincidan con ninguna obra (ej. "Cantera de tercero") tampoco se completan — comportamiento correcto.
- No se cambia código ni se toca el formulario; el auto-fill ya funciona para remitos nuevos.

### Resultado esperado
- Hasta **322** remitos pasarán a tener `cliente` poblado.
- Hasta **179** remitos pasarán a tener `cliente_destino` poblado.
- Después podrás filtrar y liquidar por cliente correctamente en la grilla y en `LiquidacionClienteDialog`.

