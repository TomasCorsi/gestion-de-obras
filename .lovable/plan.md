

# Agregar campo de litros en checklists de líquidos

## Problema
Cuando el mecánico marca OK en ítems de líquidos del checklist, no puede registrar cuántos litros se usaron.

## Ítems que tendrán campo de litros

**Checklist Cambio:**
- `aceite_motor` — Aceite de motor

**Checklist Chequeo:**
- `nivel_aceite_hidraulico` — Nivel de aceite hidráulico
- `nivel_liquido_frenos` — Nivel de líquido de frenos
- `nivel_agua_refrigerante` — Nivel de agua refrigerante
- `aceite_diferencial` — Aceite diferencial trasero y delantero
- `aceite_reductores` — Aceite de reductores

## Enfoque

Actualmente los checklists se guardan como JSONB (`Record<string, boolean>`). Se extenderán para que los ítems de líquidos puedan almacenar `true | false | { ok: true, litros: number }`. Esto es backward-compatible: los registros viejos con `true/false` siguen funcionando.

## Cambios

### 1. `mantenimientoConstants.ts`
- Agregar propiedad `hasLitros: true` a los ítems de líquidos en ambas listas
- Actualizar tipos para que el valor pueda ser `boolean | { ok: boolean; litros?: number }`
- Agregar helper `getCheckValue(val)` que normaliza ambos formatos (boolean legacy y objeto nuevo)

### 2. `MecanicoMantenimientoForm.tsx` (mobile)
- Cuando se marca OK un ítem con `hasLitros`, mostrar un input numérico inline para litros
- Al desmarcar, limpiar los litros
- Actualizar `checkCambio`/`checkChequeo` para guardar `{ ok: true, litros: X }` en lugar de `true`

### 3. `ServiceForm.tsx` (desktop)
- Misma lógica: al marcar OK en ítem de líquidos, mostrar input de litros a la derecha
- Guardar en formato objeto

### 4. `MantenimientoDetail.tsx`
- Al mostrar el checklist, si el valor es un objeto con litros, mostrar "✓ Aceite de motor — 5 lts"

### 5. `buildPayload` en ambos forms
- Ya pasan `checkCambio`/`checkChequeo` directo al JSONB, no requiere cambios porque JSONB acepta cualquier estructura

## Formato de datos (JSONB)

```text
// Antes (legacy)
{ "aceite_motor": true, "filtro_aceite_motor": false }

// Después (ítem con litros)
{ "aceite_motor": { "ok": true, "litros": 5 }, "filtro_aceite_motor": false }

// Ítem sin litros sigue igual
{ "filtro_combustible": true }
```

No requiere migración de DB — el campo JSONB acepta ambos formatos.

## Archivos a modificar
- `src/components/mantenimiento/mantenimientoConstants.ts`
- `src/components/parte-diario/MecanicoMantenimientoForm.tsx`
- `src/components/mantenimiento/ServiceForm.tsx`
- `src/components/mantenimiento/MantenimientoDetail.tsx`

