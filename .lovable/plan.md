

# Backfill horas/km desde partes diarios existentes

## Objetivo
Ejecutar un UPDATE masivo para sincronizar `maquinarias.horas_acumuladas` y `maquinarias.km_acumulados` con los últimos valores de `horometro_fin` y `km_camion` de los partes diarios completados.

## Migración SQL

```sql
UPDATE maquinarias m SET
  horas_acumuladas = COALESCE(latest.max_horometro, m.horas_acumuladas),
  km_acumulados = COALESCE(latest.max_km, m.km_acumulados)
FROM (
  SELECT maquinaria_id,
    MAX(horometro_fin) as max_horometro,
    MAX(km_camion) as max_km
  FROM partes_diarios
  WHERE estado = 'completado' AND maquinaria_id IS NOT NULL
  GROUP BY maquinaria_id
) latest
WHERE m.id = latest.maquinaria_id;
```

Esto actualiza todas las maquinarias que tienen partes completados con el mayor `horometro_fin` y `km_camion` registrado. Es una operación única de backfill; los futuros partes se sincronizarán automáticamente vía el trigger existente.

### Archivo
- Nueva migración SQL (backfill data)

