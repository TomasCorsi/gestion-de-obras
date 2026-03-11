

# Corrección masiva de horas acumuladas en maquinarias

## Acciones

### 1. Corregir partes erróneos (INSERT tool - data updates)

**Máquina 302** - parte `ddc9838f`: horometro 55738→55805 debería ser 5738→5805
```sql
UPDATE partes_diarios 
SET horometro_inicio = 5738, horometro_fin = 5805 
WHERE id = 'ddc9838f';
```

**Máquina 503** - parte `a2507f7d`: horometro 14742→14746 debería ser ~3242→3246 (el último valor correcto es ~3370)
```sql
UPDATE partes_diarios 
SET horometro_inicio = 3242, horometro_fin = 3246 
WHERE id = 'a2507f7d';
```

### 2. Re-sincronizar TODAS las máquinas (INSERT tool - bulk update)

Sobrescribir `horas_acumuladas` y `km_acumulados` con el MAX real de partes completados, bypaseando el `GREATEST` del trigger:

```sql
UPDATE maquinarias m SET
  horas_acumuladas = COALESCE(sub.max_h, 0),
  km_acumulados = COALESCE(sub.max_km, 0)
FROM (
  SELECT maquinaria_id,
    MAX(horometro_fin) as max_h,
    MAX(km_camion) as max_km
  FROM partes_diarios
  WHERE estado = 'completado' AND maquinaria_id IS NOT NULL
  GROUP BY maquinaria_id
) sub
WHERE m.id = sub.maquinaria_id;
```

Esto corrige todas las máquinas de una sola vez, incluyendo 302, 401, 503 y cualquier otra que tenga valores inflados.

