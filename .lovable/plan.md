

# Sistema de Backup / Exportación de Base de Datos

## Problema
No existe funcionalidad real detrás del botón "Exportar Datos" en Configuración. Se necesita un mecanismo para descargar un respaldo completo de todas las tablas.

## Solución
Crear un **edge function** que lea todas las tablas principales y devuelva un archivo Excel multi-hoja (una hoja por tabla), y conectar el botón existente en Configuración para descargarlo.

## Tablas incluidas en el backup
`personal`, `obras`, `clientes`, `maquinarias`, `remitos`, `viajes`, `partes_diarios`, `cargas_combustible`, `cargas_combustible_repartidor`, `mantenimientos`, `otros_gastos`, `vacaciones`, `stock_items`, `movimientos_stock`, `horas_maquina`, `cotizaciones`, `certificado_conceptos`, `certificado_items`, `entregas_epp`, `entrega_epp_items`, `registros_hh`, `observaciones_maquina_estado`, `precios_productos_mes`, `asignaciones_maquinaria_obra`, `asignaciones_personal_obra`

## Cambios

### 1. Edge Function `supabase/functions/backup-database/index.ts`
- Recibe request autenticada (solo admin)
- Consulta todas las tablas usando el service role key
- Devuelve un JSON con todas las tablas como arrays
- El formato JSON es más confiable server-side (el Excel se arma en el cliente)

### 2. `src/pages/Configuracion.tsx`
- Conectar el botón "Exportar Datos" a una función que:
  1. Llama al edge function `backup-database`
  2. Recibe el JSON con todas las tablas
  3. Usa la librería `xlsx` (ya instalada) para generar un Excel multi-hoja en el cliente
  4. Descarga el archivo como `Backup_CalaminaSur_YYYY-MM-DD.xlsx`
- Mostrar estado de carga (spinner) mientras se genera
- Solo visible/funcional para admins (ya está en ruta protegida)

### Seguridad
- El edge function valida que el usuario sea admin antes de devolver datos
- Usa `SUPABASE_SERVICE_ROLE_KEY` para leer todas las tablas sin restricciones de RLS

