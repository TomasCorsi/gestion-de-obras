

# Hacer todos los campos opcionales en Cotizaciones

## Problema
Actualmente varios campos son obligatorios tanto en la base de datos como en el formulario, lo que impide guardar cotizaciones en borrador sin tener todos los datos completos.

## Cambios

### 1. Migración de base de datos
Hacer nullable los campos que actualmente son NOT NULL:
```sql
ALTER TABLE cotizaciones ALTER COLUMN numero DROP NOT NULL;
ALTER TABLE cotizaciones ALTER COLUMN descripcion DROP NOT NULL;
ALTER TABLE cotizaciones ALTER COLUMN responsable DROP NOT NULL;
ALTER TABLE cotizaciones ALTER COLUMN fecha_vencimiento DROP NOT NULL;
```

### 2. `src/components/cotizaciones/CotizacionFormContent.tsx`
- Quitar el atributo `required` de los 5 inputs: `numero`, `responsable`, `fecha_creacion`, `fecha_vencimiento`, `descripcion`
- Quitar los asteriscos `*` de las labels correspondientes

### 3. `src/hooks/useCotizaciones.ts`
- Enviar `null` en lugar de string vacío para campos de texto vacíos (`numero`, `descripcion`, `responsable`, `fecha_vencimiento`) al crear/actualizar, siguiendo la política de campos opcionales del proyecto

