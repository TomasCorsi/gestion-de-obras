
## Auto-completar el campo Técnico con el usuario logueado

### Problema
En `MecanicoMantenimientoForm.tsx`, el campo `tecnico` se inicializa con `useState(nombreMecanico || "")` (línea 51). Si la prop `nombreMecanico` llega en un momento posterior al primer render del componente, el estado queda vacío porque `useState` solo toma el valor inicial una vez al montarse.

### Solución
Dos cambios en `src/components/parte-diario/MecanicoMantenimientoForm.tsx`:

**1. Agregar un `useEffect` que sincronice el campo `tecnico` con `nombreMecanico`**

Debajo del `useEffect` existente que maneja el preload de la máquina (línea 62), agregar:

```typescript
// Sync tecnico with logged-in mechanic's name
useEffect(() => {
  if (nombreMecanico) {
    setTecnico(nombreMecanico);
  }
}, [nombreMecanico]);
```

Esto garantiza que aunque `nombreMecanico` llegue tarde (por carga asíncrona), el campo se actualiza correctamente.

**2. Hacer el campo `Técnico` de solo lectura y visualmente distinguible**

El técnico debe ser siempre el mecánico logueado — no tiene sentido que lo puedan editar manualmente. Se cambia el `Input` a `readOnly` con un estilo de fondo diferenciado para que quede claro que es auto-completado:

```tsx
<Input
  value={tecnico}
  readOnly
  className="h-12 text-base bg-muted cursor-default"
  placeholder="Cargando nombre..."
/>
```

Se agrega también un pequeño ícono de usuario o un label auxiliar ("Completado automáticamente") para aclarar al usuario que este campo se rellena solo.

### Archivo modificado

| Archivo | Cambio |
|---|---|
| `src/components/parte-diario/MecanicoMantenimientoForm.tsx` | Agregar `useEffect` para sincronizar `tecnico` + campo `readOnly` |

**Sin cambios de base de datos.** Es un ajuste puramente de frontend.
