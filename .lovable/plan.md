## Objetivo

Re-sincronizar `horas_acumuladas` y `km_acumulados` de cada maquinaria buscando el **último parte diario con un valor razonable**, ignorando outliers (ej: 303 con 116.550h cuando el resto ronda 11.000h).

## Estrategia

Para cada maquinaria, en lugar de tomar simplemente el último parte:

1. Calcular el **percentil 90** de los `horometro_fin > 0` (y de `km_camion > 0`) en todos sus partes `completado`.
2. Definir un **tope razonable** = `percentil_90 * 1.15` (15% de margen sobre lo normal).
3. Tomar el **último parte (por fecha y created_at)** cuyo valor esté entre 0 y ese tope.
4. Actualizar `maquinarias` con ese valor.

Esto filtra automáticamente valores escritos por error (un dígito de más, errores de tipeo) y se queda con el último valor "creíble".

Si una maquinaria tiene muy pocos partes (<5), se usa el `MAX` como tope (no hay base estadística para detectar outlier).

## Cambios

### 1. Migración de datos (UPDATE)

Dos `UPDATE` sobre `maquinarias` usando CTEs:

```sql
WITH stats AS (
  SELECT maquinaria_id,
         percentile_cont(0.9) WITHIN GROUP (ORDER BY horometro_fin) AS p90,
         COUNT(*) AS n
  FROM partes_diarios
  WHERE estado='completado' AND maquinaria_id IS NOT NULL AND horometro_fin > 0
  GROUP BY maquinaria_id
),
ultimos AS (
  SELECT DISTINCT ON (p.maquinaria_id)
    p.maquinaria_id, p.horometro_fin
  FROM partes_diarios p
  JOIN stats s ON s.maquinaria_id = p.maquinaria_id
  WHERE p.estado='completado'
    AND p.horometro_fin > 0
    AND (s.n < 5 OR p.horometro_fin <= s.p90 * 1.15)
  ORDER BY p.maquinaria_id, p.fecha DESC, p.created_at DESC
)
UPDATE maquinarias m
SET horas_acumuladas = u.horometro_fin
FROM ultimos u
WHERE m.id = u.maquinaria_id;
```

Misma lógica para `km_camion` → `km_acumulados`.

### 2. Trigger `sync_horas_km_from_parte`

Modificar para que al insertar/actualizar un parte:
- Si el nuevo valor es 0 → no tocar.
- Si la maquinaria tiene `horas_acumuladas` previo y el nuevo valor es **>1.5x** ese valor → no sobrescribir (probable typo). El parte se guarda igual, pero el acumulado queda intacto.
- Caso contrario → sobrescribir normalmente.

Esto previene que un nuevo error tipográfico vuelva a romper el acumulado.

## Resultado esperado

- 303, 506, 401, etc. quedan con valores acordes al historial real.
- Futuros partes con valores absurdos no afectan el acumulado (pero quedan registrados para auditoría).
