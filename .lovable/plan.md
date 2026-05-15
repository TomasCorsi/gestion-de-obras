## Plan: Apartado "CLIENTE CANTERA" exclusivo para Franco

### 1. Migración DB
Agregar columna nueva a la tabla `remitos`:
- `cliente_cantera text NULL` — guarda el cliente seleccionado por Franco desde el catálogo de clientes.

### 2. Hook `useRemitos.ts`
- Agregar `cliente_cantera?: string | null` al tipo `RemitoForm` y al mapeo de inserción/actualización (sanitizar `""` → `null`).

### 3. Formulario `RemitoQuickFormDialog.tsx`
- Agregar `cliente_cantera: ""` al `getInitialForm()` y al `useEffect` de edición.
- Cuando `isFranco === true`, renderizar una nueva sección **"CLIENTE CANTERA"** (usando el componente `SectionTitle`) con un `Combobox` que lista todos los `clientes` activos (`clientes.filter(c => c.activo).map(c => ({ value: c.nombre, label: c.nombre }))`), con búsqueda.
- Incluir el campo en el payload de `handleSubmit`.
- Para usuarios no-Franco la sección no se renderiza, manteniendo la UI actual intacta.

### 4. Grilla `RemitosSimpleGrid.tsx` (opcional, sólo para Franco)
- Mostrar la columna "Cliente Cantera" en la grilla únicamente cuando el usuario logueado sea Franco, para que pueda ver lo que cargó. Resto de usuarios no la ven.

### Resumen
Sólo Franco verá un apartado nuevo "CLIENTE CANTERA" en el formulario de remito con un selector de todos los clientes de la base. El dato queda guardado en una columna nueva `cliente_cantera` sin afectar `cliente` ni `cliente_destino`.