

## Plan: Agregar ordenamiento manual de etapas en los certificados

### Análisis Actual
- Las etapas se agrupan mediante `groupByEtapa()` que ordena alfabéticamente
- Cada concepto tiene un campo `orden` que se usa para ordenar conceptos dentro de categorías
- Las etapas se derivan de los conceptos (campo `etapa`), pero no tienen un control de orden independiente
- En el PDF, las etapas también se muestran en orden alfabético

### Solución Propuesta

Agregar una sección de **"Gestión de Orden de Etapas"** en la pestaña de Configuración donde el usuario pueda:
1. Ver todas las etapas disponibles de una obra
2. Reordenarlas con drag-and-drop o botones up/down
3. Guardar el orden en la base de datos

#### Opción A: Tabla simple con botones (más rápido, sin drag-and-drop)
- Una tabla mostrando etapas con sus órdenes actuales
- Botones "↑" y "↓" para mover etapas arriba/abajo
- Guardar cambios en BD

#### Opción B: Drag-and-drop con librería (más visual, requiere dependencia)
- Usar `react-beautiful-dnd` o similar
- Experiencia más fluida

### Cambios Técnicos

**1. Base de datos** (`src/integrations/supabase/types.ts` - solo lectura, no modificar)
- Las etapas se almacenan en `certificado_conceptos.etapa` (texto)
- NO crear una tabla nueva de etapas (para mantener simplicidad)
- Usar el campo `orden` existente en `certificado_conceptos` para determinar orden global

**2. Backend - Nueva tabla virtual** (en React)
- Crear un objeto de mapeo: `etapa -> min_orden_concepto` 
- Al agrupar etapas, usar este mapeo en lugar de orden alfabético

**3. `src/pages/Certificados.tsx`**
- Modificar `groupByEtapa()` para aceptar un parámetro `etapaOrdenMap`
- Crear una nueva pestaña "Orden de Etapas" en la sección de configuración
- Mostrar tabla editable con etapas y sus órdenes
- Agregar funciones `moveEtapaUp()`, `moveEtapaDown()`
- Guardar el nuevo orden cuando cambia

**4. `src/hooks/useCertificados.ts`**
- Agregar función `reorderConceptos()` que actualice los campos `orden` de los conceptos pertenecientes a cada etapa

**5. `src/utils/generateCertificadoPDF.ts`**
- Pasar un `etapaOrdenMap` desde Certificados.tsx
- En `generateObraPDF()`, usar ese mapa para ordenar etapas (no alfabéticamente)

### Flujo de Uso
1. Usuario abre la pestaña "Orden de Etapas" en Configuración
2. Ve lista de etapas de la obra actual con inputs numéricos de orden
3. Cambia los números y presiona guardar
4. El sistema actualiza todos los conceptos de esa etapa para reflejar el nuevo orden
5. Al crear/editar/visualizar certificados, las etapas aparecen en el orden definido
6. El PDF también respeta ese orden

### Ventajas
- No requiere tabla nueva en BD
- Usa infraestructura existente (`orden` en conceptos)
- Simple de implementar
- Funciona tanto en UI como en PDF

