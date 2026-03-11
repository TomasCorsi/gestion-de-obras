

# Campos condicionales según tipo de maquinaria en formularios de mantenimiento

## Cambio
En `ServiceForm` y `ReparacionForm`, mostrar condicionalmente los campos numéricos según el tipo de maquinaria seleccionada:

- **Auto / Camioneta**: mostrar "Kilómetros actual" y "Próximo service (KM)". Ocultar horas y próximo HR.
- **Resto de maquinarias**: mostrar "Horas máquina" y "Próximo service (HR)". Ocultar km y próximo KM.

## Implementación

En ambos formularios:

1. Derivar el tipo de la maquinaria seleccionada:
```typescript
const selectedMaq = maquinarias.find(m => m.id === maquinariaId);
const isVehiculo = selectedMaq?.tipo === "auto" || selectedMaq?.tipo === "camioneta";
```

2. Reemplazar la grilla de 4 campos numéricos por 2 campos condicionales:
```typescript
{isVehiculo ? (
  <>
    <Field label="Kilómetros actual" value={kilometros} />
    <Field label="Próximo service (KM)" value={proximoKm} />
  </>
) : (
  <>
    <Field label="Horas máquina" value={horasMaquina} />
    <Field label="Próximo service (HR)" value={proximoHr} />
  </>
)}
```

3. Cambiar la grilla de `grid-cols-2 md:grid-cols-4` a `grid-cols-2` ya que solo se muestran 2 campos.

## Archivos
- `src/components/mantenimiento/ServiceForm.tsx`
- `src/components/mantenimiento/ReparacionForm.tsx`

