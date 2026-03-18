

# Fix: Clientes incorrectos en Remitos (DB + Export)

## Problema encontrado

Hay **dos problemas distintos**:

### 1. Datos incorrectos en la base de datos (12 remitos afectados)

El campo `cliente` (Cliente Origen) tiene valores incorrectos en 12 registros. Ejemplos:

| Desde (Obra) | Cliente guardado | Cliente correcto |
|---|---|---|
| Sótano Sargento Cabral (Ramiro) - Obra 305 | CALAMINA SUR / ARX ARCILLEX S.A | RAMIRO FINANCIERA |
| Sótano Ruta 58 (Marcelo) - Obra 306 | CALAMINA SUR / VISTA LAGOS S.A. | MARCELO NOGUEIRA |
| Sótano Mercado Canning – Etapa 2 - Obra 310 | VISTA LAGOS S.A. | MERCADO CANNING |

Estos datos se guardaron mal probablemente por una versión anterior de la lógica de auto-completado o por importación CSV con mapeo incorrecto.

### 2. Export Excel con headers y orden distintos al UI

Las columnas del Excel no coinciden con la grilla: `"Cliente"` en vez de `"Cliente Origen"`, y el orden de columnas es diferente.

## Solución

### Paso 1: Corregir los 12 registros en la DB
Ejecutar un UPDATE que recalcule `cliente` basándose en la obra del campo `desde`, aplicando la misma regla de negocio (solo obras con número >= 300 auto-completan el cliente):

```sql
UPDATE remitos r
SET cliente = c.nombre
FROM obras o
JOIN clientes c ON c.id = o.cliente_id
WHERE o.nombre = r.desde
  AND o.numero IS NOT NULL
  AND o.numero::int >= 300
  AND r.cliente != c.nombre;
```

### Paso 2: Corregir export Excel en `src/pages/Remitos.tsx`
- Renombrar `"Cliente"` → `"Cliente Origen"`
- Reordenar columnas para coincidir con la grilla: Fecha → Rem. Tercero → Rem. Local → Desde → Hasta → Tipo Material → Tipo Transporte → Maquinaria → Pat. Tercero → Cliente Origen → Cliente Destino → Viajes → C. Uni → C. Total → Unidad → P. Unit → P. Total → Proveedor → Observaciones

