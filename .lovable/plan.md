## Objetivo

Hoy el parte diario del capataz solo muestra: Obra, Horarios, Novedades, Ausencias y Observaciones. Cuando un capataz además opera una máquina/camión, no tiene cómo registrarlo. La idea es que pueda **opcionalmente** sumar el uso de una máquina sin perder sus campos de capataz.

## Solución propuesta

Agregar al formulario del capataz una sección **opcional** "¿Usaste una máquina hoy?" (toggle/switch). Al activarla se despliegan los mismos campos que ya usa el maquinista, pero todos opcionales.

### Cambios en `src/components/parte-diario/ParteDiarioFormView.tsx`

1. **Nuevo estado local** `usoMaquina: boolean` (default `false`, se infiere `true` al editar si el parte tenía `maquinaria_id`).

2. **Switch visible solo para capataz**, ubicado debajo de la tarjeta de Obra:
   - Label: "¿Usaste una máquina o camión hoy?"
   - Texto auxiliar: "Activalo si además de tus tareas de capataz operaste una máquina."

3. **Ampliar las flags de visibilidad** para que cuando `isCapataz && usoMaquina` sea `true` se muestren también:
   - `showMaquinaField` (selector de máquina)
   - `showHorometro` (inicio / fin)
   - `showCombustible` (litros cargados)
   - `showEstadoMaquina` (OK / OBSERVACIÓN + observación)
   - `showChecklist` (filtros, aceites, refrigerante)
   - Campos de chofer (viajes / km) NO se muestran — el capataz elige máquina genérica; si en el futuro se quiere distinguir camión, se agrega aparte.

4. **`buildParteData`**: si `isCapataz && !usoMaquina`, forzar `maquinaria_id: null`, horómetros 0, combustible 0, `estado_maquina: null`, checklist en `false`. Si `usoMaquina` está activo, enviar lo que el usuario completó (todos los campos siguen siendo opcionales — sin validaciones obligatorias salvo la regla existente: si elige OBSERVACIÓN debe describir).

5. **Validación**: mantener la regla actual de OBSERVACIÓN obligatoria solo si `usoMaquina` está activo y eligió OBSERVACIÓN. No exigir horómetro ni combustible.

6. **Edición**: al cargar un parte existente del capataz con `maquinaria_id` no nulo, setear `usoMaquina = true` automáticamente para que los datos sean visibles/editables.

### Sin cambios necesarios en

- **Base de datos**: la tabla `partes_diarios` ya tiene todas las columnas (`maquinaria_id`, `horometro_*`, `combustible`, `estado_maquina`, checks, etc.) y RLS ya permite al capataz gestionar partes.
- **Hook `useParteDiario`**: el insert/update ya soporta todos los campos.
- **Trigger `sync_horas_km_from_parte`**: ya sincroniza horas a `horas_maquina` y actualiza `maquinarias.horas_acumuladas` cuando el parte se completa con `maquinaria_id`. Funcionará igual para capataces.
- **Vista de detalle / lista**: ya muestran máquina si está presente; no requieren cambios.

## Resultado esperado

Un capataz que también opera puede:
- Llenar Obra + Horarios + Novedades + Ausencias (flujo actual).
- Activar el switch y además registrar máquina, horómetro, combustible, estado y checklist.
- Las horas trabajadas en la máquina quedan automáticamente reflejadas en `horas_maquina` y los acumulados de la máquina, igual que para los maquinistas.
