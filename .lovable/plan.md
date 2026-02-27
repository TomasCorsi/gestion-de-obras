

# Rediseno completo del modulo de Mantenimiento: Service y Reparacion

## Resumen

Redisenar la seccion de Mantenimiento para soportar dos tipos de registros independientes: **Service** (mantenimiento preventivo con checklists) y **Reparacion** (mantenimiento correctivo). Incluye nueva estructura de base de datos, formularios diferenciados, alertas de proximo service, exportacion y adjuntos.

---

## 1. Migracion de base de datos

Agregar columnas nuevas a la tabla `mantenimientos` existente (sin romper datos existentes):

```text
-- Nuevos campos
kilometros              NUMERIC(10,2) DEFAULT 0
proximo_service_km      NUMERIC(10,2) DEFAULT NULL
proximo_service_hr      NUMERIC(10,2) DEFAULT NULL
informe_tecnico         TEXT DEFAULT NULL
alerta_campo            TEXT DEFAULT NULL
checklist_cambio        JSONB DEFAULT NULL
checklist_chequeo       JSONB DEFAULT NULL
tecnico_id              UUID DEFAULT NULL  (referencia a personal.id)
adjunto_url             TEXT DEFAULT NULL

-- Cambiar estado enum: agregar 'pendiente', renombrar 'programado' -> 'pendiente'
ALTER TYPE estado_mantenimiento ADD VALUE 'pendiente';
-- Migrar datos existentes de 'programado' a 'pendiente'
```

**Checklists como JSONB** (evita tablas extra y es flexible):

Checklist de cambio (Service):
```text
{
  "aceite_motor": true,
  "filtro_aceite_motor": false,
  "filtro_combustible": true,
  "filtro_aire_secundario": false,
  "filtro_aire_primario": true,
  "filtro_convertidor": false
}
```

Checklist de chequeo (Service) - 19 items:
```text
{
  "nivel_aceite_hidraulico": true,
  "nivel_liquido_frenos": false,
  "nivel_agua_refrigerante": true,
  "tension_correa": false,
  "funcionamiento_relojes": true,
  "engrase_diario": true,
  "aceite_diferencial": false,
  "aceite_reductores": false,
  "eje_bomba_agua": true,
  "cilindro_hidraulico": false,
  "soldaduras_equipo": true,
  "direccion": true,
  "frenos": true,
  "partes_electricas": false,
  "perdida_aceite_motor": false,
  "funciones_convertidor": true,
  "estado_toma_aire": false,
  "tornillos_flojos": true,
  "chequeos_radiadores": false
}
```

**Storage bucket** para adjuntos:
```text
INSERT INTO storage.buckets (id, name, public) VALUES ('mantenimiento-adjuntos', 'mantenimiento-adjuntos', true);
```
Con politicas RLS para que admins, capataces, mecanicos y ayudantes puedan subir/ver archivos.

---

## 2. Actualizar hook `useMantenimientos.ts`

- Agregar los nuevos campos a las interfaces `MantenimientoDB`, `MantenimientoForm`, `MantenimientoWithRelations`
- Agregar `tecnico_id` como referencia opcional al personal
- El campo `tecnico` (texto) se mantiene para compatibilidad, pero se agrega `tecnico_id` para el selector
- Actualizar las queries para incluir datos del tecnico via join

---

## 3. Redisenar `MantenimientoPage.tsx`

### Estructura de tabs principal:
```text
[Services] [Reparaciones] [Reportes de Campo]
```

Cada tab muestra sus registros filtrados por tipo (`preventivo` = Service, `correctivo` = Reparacion).

### Barra de filtros (comun a ambos tabs):
- Busqueda por texto
- Filtro por maquina (selector)
- Filtro por tecnico (selector)
- Filtro por fecha (rango)
- Filtro por estado (pendiente/en_proceso/completado)

### KPIs por tab:
- Total registros del tipo
- Pendientes
- En proceso
- Completados
- Maquinas proximas a service (solo en tab Services)

### Cards rediseadas:
- Mostrar tipo visualmente diferenciado (azul para Service, naranja para Reparacion)
- Badge de estado
- Mostrar KM y HR actuales
- Alerta roja si la maquina supero el limite de proximo service (km o hr)
- Acciones: Ver, Editar, Eliminar, Cambiar estado, Exportar PDF

---

## 4. Formularios diferenciados

### 4a. Formulario de Service (`ServiceForm.tsx`)
Nuevo componente en `src/components/mantenimiento/ServiceForm.tsx`:

Campos obligatorios:
- Fecha (date picker)
- Maquina (Combobox con busqueda desde BD)
- Tecnico (Combobox con busqueda desde personal con rol mecanico/ayudante)
- Estado (Pendiente / En proceso / Finalizado)

Seccion "Checklist de Cambio" (6 checkboxes):
- Aceite de motor, Filtro de aceite de motor, Filtro de combustible, Filtro de aire secundario, Filtro de aire primario, Filtro convertidor

Seccion "Checklist de Chequeo" (19 checkboxes):
- Nivel aceite hidraulico, Nivel liquido frenos, Nivel agua refrigerante, Tension de correa, Funcionamiento de relojes, Engrase diario, Aceite diferencial trasero y delantero, Aceite de reductores, Eje de bomba de agua, Cilindro hidraulico, Soldaduras del equipo, Direccion, Frenos, Partes electricas, Perdida de aceite de motor, Funciones del convertidor, Estado de toma de aire, Tornillos flojos, Chequeos de radiadores

Otros campos:
- Informe tecnico (textarea)
- Repuestos utilizados (textarea)
- Horas maquina (numerico)
- Kilometros (numerico)
- Proximo service KM (numerico)
- Proximo service HR (numerico)
- Observaciones alerta de campo (textarea con borde rojo/amarillo si tiene contenido)
- Adjunto (file upload opcional)

### 4b. Formulario de Reparacion (`ReparacionForm.tsx`)
Nuevo componente en `src/components/mantenimiento/ReparacionForm.tsx`:

Campos obligatorios:
- Fecha, Maquina, Tecnico, Estado

Campos principales:
- Tareas realizadas (textarea grande)
- Repuestos utilizados (textarea)
- Horas maquina (numerico)
- Kilometros (numerico)
- Proximo service KM (numerico)
- Proximo service HR (numerico)
- Observaciones alerta de campo (textarea con borde visual)
- Adjunto (file upload opcional)

---

## 5. Dialogo de detalle rediseado

Nuevo componente `MantenimientoDetail.tsx` que muestra toda la informacion segun el tipo:
- Para Services: muestra las dos secciones de checklist con iconos de check/cross
- Para Reparaciones: muestra las tareas realizadas
- Ambos: informacion general, repuestos, costos, proximo service, adjuntos

---

## 6. Alertas de proximo service

Logica en el frontend que compara:
- `horas_maquina` actual de la maquinaria (de `maquinarias.horas_acumuladas`) vs `proximo_service_hr` del ultimo mantenimiento
- Si se supera el limite: badge rojo "Service vencido" en la card de la maquina

Tambien se muestra un KPI en el dashboard de mantenimiento con la cantidad de maquinas que necesitan service.

---

## 7. Exportacion

- **Excel**: Boton "Exportar Excel" que genera XLSX con todos los registros filtrados (usando la libreria `xlsx` ya instalada)
- **PDF**: Boton "Exportar PDF" individual por registro (usando `jspdf` ya instalada)

---

## 8. Actualizar `MecanicoMantenimientoForm.tsx` (vista mobile del mecanico)

Adaptar el formulario mobile existente para soportar los dos tipos de registro con los nuevos campos. Agregar checklists para Service y los campos de KM/HR.

---

## 9. Archivos a crear/modificar

### Nuevos archivos:
- `src/components/mantenimiento/ServiceForm.tsx` - Formulario de Service
- `src/components/mantenimiento/ReparacionForm.tsx` - Formulario de Reparacion
- `src/components/mantenimiento/MantenimientoDetail.tsx` - Dialogo de detalle
- `src/components/mantenimiento/MantenimientoCard.tsx` - Card reutilizable
- `src/components/mantenimiento/ServiceAlerts.tsx` - Alertas de proximo service
- `src/utils/generateMantenimientoPDF.ts` - Generacion de PDF
- `src/utils/exportMantenimientosExcel.ts` - Exportacion Excel

### Archivos a modificar:
- `src/hooks/useMantenimientos.ts` - Nuevos campos e interfaces
- `src/pages/MantenimientoPage.tsx` - Rediseno completo
- `src/components/parte-diario/MecanicoMantenimientoForm.tsx` - Adaptar a nuevos campos
- `src/components/mantenimiento/ObservacionesCampoTab.tsx` - Ajustar evento de crear mantenimiento para los dos tipos
- `supabase/migrations/` - Nueva migracion con los cambios de esquema
- `src/integrations/supabase/types.ts` - Se actualiza automaticamente

### Migracion SQL (1 archivo):
- Agregar columnas a `mantenimientos`
- Crear bucket de storage
- Politicas RLS del bucket

---

## Secuencia de implementacion

1. Migracion de base de datos (nuevas columnas + bucket de storage)
2. Actualizar `useMantenimientos.ts` con nuevas interfaces
3. Crear componentes de formulario (ServiceForm, ReparacionForm)
4. Crear componente de detalle y cards
5. Redisenar MantenimientoPage con 3 tabs
6. Implementar logica de alertas de proximo service
7. Agregar exportacion Excel y PDF
8. Actualizar formulario mobile del mecanico
9. Ajustar ObservacionesCampoTab para los dos tipos

