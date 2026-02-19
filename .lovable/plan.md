
## Módulo de Mantenimiento para Mecánicos en el Parte Diario

### Objetivo
Agregar, dentro de la vista del Parte Diario del rol **Mecánico** (y Ayudante), dos nuevas secciones accesibles desde la pantalla principal:
1. **Ver Observaciones de Campo** — alertas pendientes reportadas por maquinistas/choferes, con opción de registrar mantenimiento correctivo desde ahí.
2. **Registrar Mantenimiento** — formulario para crear mantenimientos libres (sin necesidad de que exista una observación previa).

Todo diseñado con la misma filosofía mobile-first del resto de la app: tarjetas grandes, botones táctiles, flujo claro.

---

### Arquitectura de la solución

El flujo de navegación del Parte Diario se extiende con nuevas vistas:

```text
ParteDiario.tsx
│
├── ViewMode: 'home'  ← ParteDiarioHomeView
│     [Para mecanico/ayudante: se añaden 2 botones nuevos]
│     ┌───────────┬──────────────┐
│     │ Nuevo     │  Mis Partes  │
│     │ Parte     │              │
│     ├───────────┴──────────────┤
│     │ 🔔 Alertas    │ 🔧 Nuevo  │
│     │    de Campo   │   Manto.  │
│     └───────────────┴──────────┘
│
├── ViewMode: 'form'  ← ParteDiarioFormView (sin cambios)
│
├── ViewMode: 'alerts' (NUEVO) ← MecanicoObservacionesView
│     Muestra observaciones pendientes de maquinistas
│     Permite marcar como atendida + crear mantenimiento
│
└── ViewMode: 'mantenimiento' (NUEVO) ← MecanicoMantenimientoForm
      Formulario mobile para registrar mantenimiento libre
```

---

### Cambios técnicos detallados

#### 1. `src/pages/ParteDiario.tsx`
- Extender `ViewMode` con `'alerts'` y `'mantenimiento'`
- Detectar cuando el rol es `mecanico` o `ayudante` para pasar la prop `isMecanico`
- Agregar handlers: `handleGoToAlerts()`, `handleGoToMantenimiento(obs?)` (el parámetro `obs` permite pre-llenar el form desde una alerta)
- Renderizar los dos nuevos componentes cuando el view lo indica

#### 2. `src/components/parte-diario/ParteDiarioHomeView.tsx`
- Agregar prop `isMecanico?: boolean` y `onVerAlertas?: () => void` y `onNuevoMantenimiento?: () => void`
- Cuando `isMecanico`, mostrar un grid de 2x2 con los 4 botones:
  - Nuevo Parte / Mis Partes (fila 1)
  - Alertas de Campo (con badge del número de pendientes) / Nuevo Mantenimiento (fila 2)

#### 3. Nuevo componente: `src/components/parte-diario/MecanicoObservacionesView.tsx`
Vista mobile de observaciones pendientes. Usa `useObservacionesMaquina`. Diseño compacto:
- Header con botón Atrás y contador de pendientes
- Lista de tarjetas con: nombre máquina, patente, operador, fecha, descripción
- Indicador de urgencia por color (borde izquierdo: verde < 3d, naranja 3-7d, rojo 7d+)
- Dos botones por tarjeta: **Marcar como atendida** y **Crear Mantenimiento** (navega a la vista de form con datos pre-llenados)
- Sección inferior con "atendidas recientes" colapsable

#### 4. Nuevo componente: `src/components/parte-diario/MecanicoMantenimientoForm.tsx`
Formulario mobile para registrar un mantenimiento. Usa `useMantenimientos` y `useMaquinarias`.
Campos con UX mobile-first (tarjetas grandes, inputs h-14):
- Fecha (prellenada con hoy)
- Máquina (Combobox buscable por código/patente/tipo)
- Tipo de mantenimiento (radio visual: Preventivo / Correctivo / Emergencia)
- Estado (radio visual: Programado / En Proceso / Completado)
- Descripción (Textarea)
- Repuestos (Textarea, opcional)
- Técnico (Input, prellenado con nombre del mecánico si está disponible)
- Horas máquina (Input numérico)
- Costo repuestos + Costo mano de obra (se calcula el total automáticamente)
- Próximo mantenimiento (fecha, opcional)
- Observaciones (opcional)
- Botones sticky footer: **Guardar** (spinner mientras procesa)

Si viene desde una observación de campo (`obsId`), se pre-llenan: máquina, tipo=correctivo, descripción, y se guarda el `observacion_reporte_id`.

---

### Diseño visual del Home para mecánico

```text
┌─────────────────────────────────┐
│  📋 Parte Diario                │
│  Hola, Juan (Mecánico)          │
│                                 │
│ ┌──────────────┬──────────────┐ │
│ │   Nuevo      │  Mis Partes  │ │
│ │   Parte      │              │ │
│ │   [+]        │   [📋]       │ │
│ └──────────────┴──────────────┘ │
│                                 │
│ ┌──────────────┬──────────────┐ │
│ │  🔔 Alertas  │  🔧 Nuevo   │ │
│ │  de Campo    │  Mantenim.  │ │
│ │  [3 pend.]   │             │ │
│ └──────────────┴──────────────┘ │
└─────────────────────────────────┘
```

---

### Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `src/pages/ParteDiario.tsx` | Modificar: nuevas views y handlers |
| `src/components/parte-diario/ParteDiarioHomeView.tsx` | Modificar: botones adicionales para mecánico |
| `src/components/parte-diario/MecanicoObservacionesView.tsx` | Crear nuevo |
| `src/components/parte-diario/MecanicoMantenimientoForm.tsx` | Crear nuevo |

**Sin cambios de base de datos** — se reutilizan las tablas y hooks existentes (`useMantenimientos`, `useObservacionesMaquina`, `useMaquinarias`).

### Permisos RLS
La tabla `mantenimientos` ya tiene política que permite `ALL` a `admin` y `capataz`. Los mecánicos NO tienen permiso de escritura actualmente. Se necesitará agregar una política RLS para permitir a usuarios con rol `mecanico` hacer INSERT en `mantenimientos`. La política de lectura ya existe a través del rol `maquinista` — se agregará también para `mecanico`.

Se creará una migración con:
```sql
-- Mecánicos pueden ver mantenimientos
CREATE POLICY "Mecanicos can view mantenimientos"
  ON mantenimientos FOR SELECT
  USING (has_role(auth.uid(), 'mecanico'::app_role));

-- Mecánicos pueden crear y actualizar mantenimientos
CREATE POLICY "Mecanicos can manage mantenimientos"
  ON mantenimientos FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'mecanico'::app_role));

CREATE POLICY "Mecanicos can update mantenimientos"
  ON mantenimientos FOR UPDATE
  USING (has_role(auth.uid(), 'mecanico'::app_role));

-- Mecánicos necesitan ver maquinarias para el selector
-- (ya tienen SELECT via la política de maquinistas — verificar que aplique a mecanico también)
```

También se verificará si `mecanico` necesita acceso a `observaciones_maquina_estado` para leer las observaciones.
