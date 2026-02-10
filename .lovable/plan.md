

## Plan: Corregir nombre del repartidor y total de litros del dia

### Problemas identificados

1. **Nombre del repartidor vacio**: El hook `useCargasRepartidor` no incluye la relacion `repartidor` en la query de Supabase, por lo que no se trae el nombre de quien cargo. La interfaz `CargaRepartidor` tampoco tiene ese campo.

2. **Total de litros incorrecto**: El hook calcula `totalLitros` sumando TODAS las cargas del repartidor (de todas las fechas). Pero en `ParteDiario.tsx` se filtra `cargasHoy` solo por fecha de hoy, y sin embargo se pasa el `totalLitros` completo como `totalLitrosHoy`. El total no coincide con las cargas mostradas.

### Cambios

#### 1. `src/hooks/useCargasRepartidor.ts`
- Agregar la relacion `repartidor` al select de la query (igual que ya se hace en `useCargasRepartidorAll.ts`):
  ```
  repartidor:personal!cargas_combustible_repartidor_repartidor_id_fkey(nombre, apellido)
  ```
- Agregar el campo `repartidor` a la interfaz `CargaRepartidor`

#### 2. `src/pages/ParteDiario.tsx`
- Calcular `totalLitrosHoy` a partir de `cargasHoy` en lugar de usar el `totalLitros` general:
  ```
  const totalLitrosHoy = cargasHoy.reduce((sum, c) => sum + (c.litros || 0), 0);
  ```
- Pasar este valor correcto al componente `ParteDiarioHomeView`

#### 3. `src/components/parte-diario/CargasCombustibleRepartidorList.tsx`
- Mostrar el nombre del repartidor en cada tarjeta (una linea adicional con "Repartidor: Apellido, N.")

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useCargasRepartidor.ts` | Agregar join de `repartidor` y campo en interfaz |
| `src/pages/ParteDiario.tsx` | Calcular totalLitrosHoy desde cargasHoy |
| `src/components/parte-diario/CargasCombustibleRepartidorList.tsx` | Mostrar nombre del repartidor |

