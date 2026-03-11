

# Re-sincronizar horas y km de maquinarias desde partes corregidos

## Problema
El trigger `sync_horas_km_from_parte` usa `GREATEST()`, por lo que aunque se corrija un parte diario, el valor erróneo alto queda fijado en `maquinarias`. Necesitamos forzar la sincronización directa.

## Migración SQL (data fix)

Una única migración que sobreescribe directamente los valores:

```sql
UPDATE maquinarias m SET
  horas_acumuladas = COALESCE(latest.max_horometro, 0),
  km_acumulados = COALESCE(latest.max_km, 0)
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

A diferencia del backfill anterior, este **no** usa `GREATEST` -- sobreescribe directamente con el `MAX` actual de los partes, que ya tienen los datos corregidos.

## Archivo
- Nueva migración SQL (una sola sentencia UPDATE)

