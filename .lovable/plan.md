

# Fix: Botón Finalizar bloqueado al editar mantenimientos

## Problema

Al editar un mantenimiento guardado parcialmente, el botón "Finalizar" queda deshabilitado aunque el mecánico modifique datos. La causa está en `MecanicoMantenimientoForm.tsx`:

1. **Services (preventivo):** La validación requiere `informeTecnico.trim()`, pero el guardado parcial almacena el texto en `descripcion` y deja `informe_tecnico` vacío. Al recargar, `informeTecnico` queda vacío → botón bloqueado.

2. **Reparaciones (correctivo):** Si `descripcion` era "Pendiente de completar", se limpia a `""` al editar (línea 66). El usuario debe volver a escribir la descripción para habilitar Finalizar, aunque ya haya cambiado otros campos.

## Solución

### `src/components/parte-diario/MecanicoMantenimientoForm.tsx`

**Cambio 1 — Inicializar `informeTecnico` desde `descripcion` si está vacío (para services editados):**

```typescript
// Línea 67: al editar un service, si informe_tecnico está vacío, usar descripcion
const [informeTecnico, setInformeTecnico] = useState(
  editData?.informe_tecnico || 
  (editData?.tipo === "preventivo" && editData?.descripcion !== "Pendiente de completar" ? editData?.descripcion || "" : "")
);
```

**Cambio 2 — No limpiar `descripcion` si el texto es útil (para reparaciones editadas):**

```typescript
// Línea 66: solo limpiar si era el placeholder
const [descripcion, setDescripcion] = useState(
  editData?.descripcion === "Pendiente de completar" ? "" : (editData?.descripcion || "")
);
// Sin cambios en esta línea (ya funciona bien), el problema real es el Cambio 1
```

**Cambio 3 — Relajar la validación de Finalizar cuando se edita:**

Actualmente `isValidFull` es estricto. Debería considerar que al editar un registro existente que ya tiene contenido guardado, no necesita re-validar todo:

```typescript
const isValidFull = maquinariaId && tecnico.trim() && 
  (isService ? informeTecnico.trim() : descripcion.trim());
```

Esto ya está correcto si el Cambio 1 se aplica. El `informeTecnico` se inicializará con el contenido correcto y el botón se habilitará.

Un solo archivo a modificar: `MecanicoMantenimientoForm.tsx`, solo la inicialización del estado `informeTecnico`.

