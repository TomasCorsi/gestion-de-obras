

## Plan: Cargar observaciones históricas faltantes

### Problema
El trigger que sincroniza observaciones solo se activa cuando se crea o actualiza un parte diario **a partir de ahora**. Los 65 partes diarios anteriores con `estado_maquina = 'OBSERVACION'` nunca generaron registros en la tabla de seguimiento.

### Solución
Ejecutar una migración SQL que inserte todos los registros históricos faltantes en `observaciones_maquina_estado`, tomándolos directamente de `partes_diarios`.

### Cambio único

**Migración SQL** que ejecuta:

```text
INSERT INTO observaciones_maquina_estado (parte_diario_id, maquinaria_id, fecha_reporte, observacion)
SELECT id, maquinaria_id, fecha, COALESCE(observacion_maquina, '')
FROM partes_diarios
WHERE estado_maquina = 'OBSERVACION'
  AND maquinaria_id IS NOT NULL
  AND id NOT IN (SELECT parte_diario_id FROM observaciones_maquina_estado);
```

Esto insertará los ~65 registros faltantes como "Pendientes" (atendida = false por defecto), y aparecerán inmediatamente en la pestaña de Reportes de Campo.

### Resultado
- Todas las observaciones históricas aparecerán en el listado de mantenimiento
- No se duplicarán registros gracias al filtro `NOT IN`
- A futuro, el trigger seguirá creando registros automáticamente para partes nuevos
