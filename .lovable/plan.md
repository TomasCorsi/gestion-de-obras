

## Plan: Quitar repartidor de la card y verificar columna en tabla admin

### Cambios

#### 1. `src/components/parte-diario/CargasCombustibleRepartidorList.tsx`
- Eliminar las lineas 89-94 (el bloque "Row 2: Repartidor") de las tarjetas moviles. El repartidor no necesita mostrarse ahi ya que el usuario que esta viendo es el propio repartidor.

#### 2. `src/components/gastos/CombustibleRepartidorTab.tsx`
- La tabla admin ya tiene la columna "Repartidor" implementada. Verificar que los datos se muestran correctamente con el fallback a `parte_diario.personal` cuando `repartidor` es null. No se requieren cambios si ya funciona (la imagen muestra que si muestra "JEREZ, V.").

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/parte-diario/CargasCombustibleRepartidorList.tsx` | Eliminar bloque de repartidor de las cards |

