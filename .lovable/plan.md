
# Plan: Restringir acceso al sistema solo para administradores

## Resumen
Modificar el sistema de permisos para que **solo los administradores** tengan acceso completo a todas las funcionalidades del sistema. Los usuarios con otros roles (capataz, maquinista, ayudante) solo podrán acceder a la sección de **Parte Diario**.

## Cambios necesarios

### 1. Modificar rutas protegidas (src/App.tsx)
Actualizar todas las rutas para que solo `admin` tenga acceso:
- Dashboard, Obras, Viajes, Remitos, Gastos, Mantenimiento, Stock, Cotizaciones, Personal, Maquinarias, Reportes, Configuracion: solo `['admin']`
- Parte Diario: accesible para todos los roles autenticados `['admin', 'capataz', 'maquinista', 'ayudante']`
- Ruta raíz (`/`): redirigir automáticamente a `/parte-diario` para usuarios no-admin

### 2. Actualizar Index.tsx (Página principal)
Modificar la lógica de redirección:
- Si el usuario **no es admin**: redirigir automáticamente a `/parte-diario`
- Si el usuario **es admin**: mostrar el App Launcher con todas las aplicaciones

### 3. Actualizar AppLauncher.tsx
Simplificar los roles de acceso en cada aplicación:
- Todas las apps excepto Parte Diario: solo `['admin']`
- Parte Diario: `['admin', 'capataz', 'maquinista', 'ayudante']`

### 4. Actualizar TopNavbar.tsx
Modificar la lógica de visibilidad del AppLauncher:
- Mostrar el botón de AppLauncher **solo para admin**
- Ocultar notificaciones y launcher para todos los demás roles

### 5. Actualizar ParteDiario.tsx
Ajustar la vista administrativa:
- Solo `admin` ve la vista de administración (ParteDiarioAdminView)
- Capataz ahora ve la misma interfaz que maquinistas/choferes (su propio parte diario)

### 6. Actualizar useEmpleadoProfile.ts
Simplificar la detección de "empleado de campo":
- Ahora **todos los que no son admin** son tratados como empleados de campo
- Esto incluye capataz, maquinista, chofer, ayudante, etc.

## Diagrama de acceso resultante

```text
+-------------------+------------------------+------------------+
| Rol               | Acceso                 | Vista Inicial    |
+-------------------+------------------------+------------------+
| admin             | Todo el sistema        | App Launcher (/) |
| capataz           | Solo Parte Diario      | /parte-diario    |
| maquinista        | Solo Parte Diario      | /parte-diario    |
| ayudante          | Solo Parte Diario      | /parte-diario    |
+-------------------+------------------------+------------------+
```

## Archivos a modificar
1. `src/App.tsx` - Rutas y roles requeridos
2. `src/pages/Index.tsx` - Lógica de redirección  
3. `src/components/layout/AppLauncher.tsx` - Roles por aplicación
4. `src/components/layout/TopNavbar.tsx` - Visibilidad de controles
5. `src/pages/ParteDiario.tsx` - Vista admin vs empleado
6. `src/hooks/useEmpleadoProfile.ts` - Detección de tipo de usuario

## Consideraciones
- Los usuarios no-admin que intenten acceder a rutas restringidas serán redirigidos a `/sin-acceso`
- El capataz ahora cargará su propio parte diario como cualquier otro empleado, sin acceso a ver todos los partes
- Las políticas RLS de la base de datos ya están configuradas correctamente, no requieren cambios
