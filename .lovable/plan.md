

# Corregir horómetro de máquina 306

## Problema
El parte `d631cc03` del 09/02/2026 (ALAN EZEQUIEL MEDINA) tiene `horometro_fin = 8541` cuando debería ser `5841`. La secuencia lo confirma: el inicio es 5833 y el siguiente parte arranca en ~5846.

## Migración SQL

Dos operaciones en una migración:

1. **Corregir el parte erróneo** (8541 → 5841):
```sql
UPDATE partes_diarios 
SET horometro_fin = 5841 
WHERE id = 'd631cc03-3c5a-461c-9744-2287836e15fe';
```

2. **Re-sincronizar la máquina 306** con el MAX real de sus partes completados (bypasseando el GREATEST del trigger):
```sql
UPDATE maquinarias SET
  horas_acumuladas = COALESCE((
    SELECT MAX(horometro_fin) FROM partes_diarios 
    WHERE maquinaria_id = 'd1c5fbb8-3b18-4ab5-9f40-ae698139e839' 
      AND estado = 'completado'
  ), 0)
WHERE id = 'd1c5fbb8-3b18-4ab5-9f40-ae698139e839';
```

Resultado esperado: `horas_acumuladas` pasará de 8541 a **5907** (el MAX real actual después de la corrección).

## Archivo
- Nueva migración SQL

