

# Actualizar horas/km con último horómetro de fin

## Problema actual
El trigger actual **acumula deltas** (suma diferencias entre horómetro inicio y fin). El usuario necesita que `horas_acumuladas` refleje directamente el **último valor de `horometro_fin`** cargado en los partes diarios, y `km_acumulados` el último `km_camion`.

## Cambio

### 1. Migración SQL - Reemplazar lógica del trigger

Modificar `sync_horas_km_from_parte()` para que cuando un parte se complete:
- `maquinarias.horas_acumuladas = NEW.horometro_fin` (último horómetro)
- `maquinarias.km_acumulados = NEW.km_camion` (último km)

Solo actualiza si el nuevo valor es mayor al actual (para no retroceder con partes viejos).

```sql
-- En la sección de actualización de maquinarias:
UPDATE maquinarias SET
  horas_acumuladas = GREATEST(horas_acumuladas, COALESCE(NEW.horometro_fin, 0)),
  km_acumulados = GREATEST(km_acumulados, COALESCE(NEW.km_camion, 0))
WHERE id = NEW.maquinaria_id;
```

La parte de `horas_maquina` (registro por obra/día) se mantiene igual ya que eso sí necesita el cálculo de horas trabajadas.

### 2. Frontend
- En `Maquinarias.tsx`, el label "Horas Acumuladas" se puede renombrar a "Horómetro Actual" para mayor claridad.
- Hacer el campo read-only en el formulario (ya que se actualiza automáticamente).

### Archivos a modificar
- **Migración SQL**: actualizar función del trigger
- `src/pages/Maquinarias.tsx`: renombrar label, hacer campo readonly

