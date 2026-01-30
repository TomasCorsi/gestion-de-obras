
# Plan: Vinculación Manual de Usuarios con Legajos

## Resumen
Agregar una funcionalidad en el panel de **Gestión de Usuarios** (Configuración) que permita a los administradores vincular manualmente usuarios registrados con sus respectivos empleados (legajos) cuando la vinculación automática no funcionó.

## Situación Actual
- Hay usuarios registrados (ej: "Alan Wertz") que tienen una cuenta pero **no están vinculados** a un registro de empleado en la tabla `personal`
- La vinculación automática por legajo funciona al registrarse, pero puede fallar si el empleado se registró sin legajo o hubo un error
- Solo los administradores podrán realizar esta vinculación manual

## Diseño de la Interfaz

Se agregará una columna adicional "Legajo" en la tabla de usuarios con un botón para vincular:

```text
+-------------------------------------------------------------------------+
|  👥 Gestión de Usuarios                                                 |
|  Administra los usuarios y sus roles en el sistema                      |
+-------------------------------------------------------------------------+
| Usuario         | Teléfono | Registro   | Legajo          | Rol     |   |
+-----------------|----------|------------|-----------------|---------|---|
| Sofia Tognini   | -        | 15/01/2025 | 144 - Sofia T.  | Admin   |[▼]|
| Alan Wertz      | -        | 10/01/2025 | [Vincular →]    | Maquin. |[▼]|
| Edgar Zacarías  | -        | 08/01/2025 | 162 - Edgar Z.  | Maquin. |[▼]|
+-------------------------------------------------------------------------+
```

Al hacer clic en **"Vincular"**, se abrirá un diálogo modal:

```text
+------------------------------------------+
|  🔗 Vincular Usuario con Empleado        |  [X]
+------------------------------------------+
|                                          |
|  Usuario: Alan Wertz                     |
|                                          |
|  Seleccionar Empleado:                   |
|  [▼ Buscar por legajo o nombre...    ]   |
|                                          |
|  Empleados disponibles (sin vincular):   |
|  ○ 25 - ALAN NICOLAS WERTZ               |
|  ○ 100 - JORGE HORACIO ROCHA             |
|  ○ 104 - RAFAEL JESUS FLOR               |
|  ...                                     |
|                                          |
+------------------------------------------+
|            [Cancelar]  [Vincular]        |
+------------------------------------------+
```

## Archivos a Crear/Modificar

### 1. Nuevo Componente: `src/components/configuracion/LinkUserDialog.tsx`
Dialog modal para seleccionar el empleado a vincular:
- Muestra lista de empleados sin vincular (`personal` donde `user_id IS NULL`)
- Permite buscar por legajo o nombre
- Ejecuta el UPDATE para vincular `user_id` en la tabla `personal`

### 2. Modificar: `src/components/configuracion/UserManagement.tsx`
- Agregar columna "Legajo" a la tabla
- Mostrar el legajo vinculado si existe, o botón "Vincular" si no
- Agregar estado para manejar el dialog de vinculación
- Fetch adicional de datos de `personal` para mostrar vinculaciones
- Agregar opción de "Desvincular" para usuarios ya vinculados

## Flujo Técnico

1. **Cargar datos**: Al montar el componente, obtener:
   - Usuarios de `profiles` con sus roles
   - Datos de `personal` para ver vinculaciones existentes
   - Lista de empleados sin vincular para el dropdown

2. **Vincular**: 
   - Admin selecciona empleado del dropdown
   - Se ejecuta `UPDATE personal SET user_id = ? WHERE id = ?`
   - Se refresca la lista de usuarios

3. **Desvincular** (opcional):
   - Admin puede quitar la vinculación
   - Se ejecuta `UPDATE personal SET user_id = NULL WHERE user_id = ?`

## Detalles Técnicos

### Consulta para obtener datos de vinculación:
```typescript
// Obtener usuarios con su vinculación a personal
const { data: profiles } = await supabase
  .from('profiles')
  .select('user_id, nombre_completo, telefono, created_at');

const { data: personalData } = await supabase
  .from('personal')
  .select('id, legajo, nombre, apellido, user_id');

// Empleados disponibles para vincular (sin user_id)
const availablePersonal = personalData?.filter(p => !p.user_id);
```

### Función para vincular:
```typescript
const linkUserToPersonal = async (userId: string, personalId: string) => {
  const { error } = await supabase
    .from('personal')
    .update({ user_id: userId })
    .eq('id', personalId);
    
  if (error) throw error;
  toast.success('Usuario vinculado correctamente');
};
```

## Consideraciones de Seguridad
- Solo usuarios con rol `admin` pueden acceder a Configuración (ya implementado)
- Las políticas RLS de la tabla `personal` permiten que admins hagan UPDATE
- Se validará que el empleado seleccionado no esté ya vinculado

## Resultado Esperado
Los administradores podrán:
1. Ver qué usuarios están vinculados a qué legajos
2. Vincular manualmente usuarios sin legajo a empleados existentes
3. Desvincular usuarios si es necesario
4. Buscar empleados por legajo o nombre para facilitar la vinculación
