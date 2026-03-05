

# Nuevo rol "Remitero" - Solo acceso a Remitos

## Resumen
Crear un nuevo rol de aplicación `remitero` que solo tenga acceso a la sección de Remitos con permisos completos de lectura y escritura (CRUD).

## Cambios necesarios

### 1. Base de datos
- **Agregar valor al enum `app_role`**: `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'remitero'`
- **RLS en tabla `remitos`**: Agregar política para que `remitero` pueda hacer CRUD completo (INSERT, SELECT, UPDATE, DELETE)
- **RLS en tablas auxiliares**: Agregar políticas SELECT para `remitero` en `obras`, `maquinarias` y `clientes` (necesarias para los selectores/dropdowns del formulario de remitos)

### 2. Auth (`src/hooks/useAuth.tsx`)
- Agregar `'remitero'` al tipo `AppRole`

### 3. Navegación - Redirección automática
- **`src/pages/Index.tsx`**: Redirigir a `remitero` directamente a `/remitos` (igual que se hace con otros roles no-admin)
- **`src/components/layout/Sidebar.tsx`**: Agregar `'remitero'` a los roles permitidos del item "Remitos"

### 4. Rutas (`src/App.tsx`)
- Agregar `'remitero'` a `requiredRoles` de la ruta `/remitos`

### 5. Trigger de registro (`handle_new_user`)
- No requiere cambio: el rol `remitero` se asignaría manualmente desde Configuración, no automáticamente al registrarse

### 6. Componentes de navegación
- **`src/pages/Index.tsx`** (apps array): Agregar `'remitero'` solo al item de Remitos
- **`src/components/layout/TopNavbar.tsx`**: El navbar ya funciona para todos los roles autenticados

