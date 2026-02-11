

## Mostrar datos completos en cards de Reportes de Campo

### Cambios necesarios

**1. Hook `src/hooks/useObservacionesMaquina.ts`**
- Agregar `patente` al select del join de maquinaria: `maquinaria:maquinaria_id(codigo, nombre, tipo, patente)`
- Actualizar la interfaz `ObservacionMaquina` para incluir `patente` en el tipo de `maquinaria`

**2. Componente `src/components/mantenimiento/ObservacionesCampoTab.tsx`**
- Reorganizar el contenido de cada card para mostrar claramente:
  - **Nombre de maquinaria** (ya existe, se mantiene como titulo)
  - **Patente** (nuevo, se agrega debajo del nombre)
  - **Fecha** del reporte (ya existe)
  - **Quien cargo la observacion** (operador del parte diario, ya existe)
  - **Detalle** de la observacion (ya existe)
- Se elimina el codigo de maquinaria del titulo y se deja solo el nombre
- La patente se muestra como dato adicional junto a fecha y operador

### Datos en la card (resultado final)

```
[ ] Nombre Maquinaria          [Pendiente]
    Patente: ABC-123
    Fecha: 30/01/2026 | Operador: Juan Perez
    
    Detalle de la observacion aqui...
```

### Detalle tecnico

| Archivo | Cambio |
|---|---|
| `src/hooks/useObservacionesMaquina.ts` | Agregar `patente` al select del join y al tipo de la interfaz |
| `src/components/mantenimiento/ObservacionesCampoTab.tsx` | Reorganizar card para mostrar nombre, patente, fecha, operador y detalle |
