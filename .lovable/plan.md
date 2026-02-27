

# Actualizar formulario mobile de Mantenimiento para Mecánicos

## Problema

El formulario de "Nuevo Mantenimiento" que ven los mecánicos desde `/parte-diario` en celular (`MecanicoMantenimientoForm.tsx`) no fue actualizado con los nuevos campos del rediseno. Sigue mostrando el formulario viejo sin:
- Diferenciacion entre Service y Reparacion
- Checklists de Cambio (6 items) y Chequeo (19 items) para Services
- Campos de Kilometros, Proximo Service KM/HR
- Campo de Informe Tecnico y Alerta de Campo con estilo visual
- Subida de adjuntos

## Solucion

Reescribir `MecanicoMantenimientoForm.tsx` para que adapte su contenido segun el tipo seleccionado, reutilizando las constantes de `mantenimientoConstants.ts`.

### Cambios en el formulario

1. **Selector de tipo** (Service / Reparacion / Emergencia) - ya existe, se mantiene
2. **Si el tipo es "preventivo" (Service)**:
   - Mostrar seccion "Checklist de Cambio" con 6 checkboxes en grilla de 2 columnas (optimizado mobile)
   - Mostrar seccion "Checklist de Chequeo" con 19 checkboxes en grilla de 1-2 columnas
   - Mostrar campo "Informe tecnico" (textarea) en lugar de "Descripcion del trabajo"
3. **Si el tipo es "correctivo" o "emergencia" (Reparacion)**:
   - Mostrar campo "Tareas realizadas" (textarea grande) - el campo "Descripcion" actual
4. **Campos nuevos para ambos tipos**:
   - Kilometros (numerico, inputMode decimal)
   - Proximo service KM (numerico)
   - Proximo service HR (numerico)
   - Alerta de campo (textarea con borde rojo/amarillo si tiene contenido)
5. **Reorganizar los campos existentes**: Horas maquina y Kilometros en grilla de 2 columnas; Proximo Service KM y HR en otra grilla de 2 columnas

### Estructura visual mobile

```text
[Header con boton volver]

[Banner alerta campo si viene de obs]

[Fecha]
[Maquina (buscador)]
[Tipo: Preventivo | Correctivo | Emergencia]
[Estado: Pendiente | En proceso | Completado]

--- Si Service ---
[Checklist de Cambio - 6 items, grid 2 cols]
[Checklist de Chequeo - 19 items, grid 1 col]
[Informe tecnico (textarea)]

--- Si Reparacion ---
[Tareas realizadas (textarea)]

--- Comun ---
[Repuestos (textarea)]
[Horas maquina | Kilometros] (grid 2 cols)
[Prox. Service KM | Prox. Service HR] (grid 2 cols)
[Costos repuestos | Mano obra] (grid 2 cols)
[Alerta de campo (textarea, borde rojo si tiene texto)]
[Observaciones (textarea)]
[Tecnico (readonly, autocompletado)]

[Sticky footer: Cancelar | Guardar]
```

### Detalles tecnicos

**Archivo a modificar:** `src/components/parte-diario/MecanicoMantenimientoForm.tsx`

- Importar `CHECKLIST_CAMBIO_ITEMS`, `CHECKLIST_CHEQUEO_ITEMS`, `emptyChecklistCambio`, `emptyChecklistChequeo` desde `mantenimientoConstants.ts`
- Importar `Checkbox` desde `@/components/ui/checkbox`
- Agregar estados: `checkCambio`, `checkChequeo`, `kilometros`, `proximoKm`, `proximoHr`, `informeTecnico`, `alertaCampo`
- Renderizar condicionalmente las secciones de checklist solo cuando `tipo === "preventivo"`
- Incluir los nuevos campos en el payload de `handleSubmit` enviando `checklist_cambio`, `checklist_chequeo`, `kilometros`, `proximo_service_km`, `proximo_service_hr`, `informe_tecnico`, `alerta_campo`
- El campo "Descripcion del trabajo" se renombra a "Informe tecnico" para Service o "Tareas realizadas" para Reparacion
- Los checklists usan grillas compactas optimizadas para pantallas de celular (grid-cols-1 para chequeo de 19 items, grid-cols-2 para cambio de 6 items)
- El campo de alerta de campo muestra borde rojo cuando tiene contenido (misma logica que en ServiceForm desktop)

