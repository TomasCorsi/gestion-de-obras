## Mostrar y filtrar por creador del remito (solo admin/capataz)

### Cambios

**1. `src/hooks/useRemitos.ts`**
- Agregar `created_by: string | null` a la interfaz `RemitoDB`. El campo ya existe en la tabla y se setea automáticamente vía trigger `set_remito_created_by`.

**2. Nuevo hook `src/hooks/useRemitosCreators.ts`** (o inline en Remitos.tsx)
- Trae los `profiles` (user_id → nombre_completo) de los user_ids únicos presentes en remitos. La policy `Admins can view all profiles` permite a admin/capataz leer todos. Si la query falla por permisos (otros roles), devuelve mapa vacío sin romper la UI.
- Solo se ejecuta cuando el usuario es admin o capataz (no para Sergio/Franco/remiteros).

**3. `src/pages/Remitos.tsx`**
- Calcular `isAdminOrCapataz` (no `isOwnOnly`). Cargar el mapa de creadores con el hook nuevo.
- Estado `creadorFilter` (`__all__` por defecto).
- Agregar `<Select>` "Cargado por" al lado del filtro "Tipo material", visible solo cuando `isAdminOrCapataz`. Las opciones se construyen desde los `created_by` distintos en `remitos`, mostrando el nombre completo (fallback al UUID truncado si no hay profile).
- Aplicar el filtro en `filteredRemitos`: `r.created_by === creadorFilter`.
- Pasar `creadoresMap` como prop a `RemitosSimpleGrid`.

**4. `src/components/remitos/RemitosSimpleGrid.tsx`**
- Aceptar prop opcional `creadoresMap?: Record<string, string>`.
- Agregar columna "Cargado por" (solo si `creadoresMap` está definido) al final, antes de "Acciones". Muestra `creadoresMap[r.created_by]` o `"-"`.
- Incluir el nombre en el export Excel también (en `Remitos.tsx`, agregar columna "Cargado por" al objeto `data`).

### Verificación
- Login como admin → ve la columna "Cargado por" con nombres reales (ej. "Franco Buceta", "Sergio …") y puede filtrar por creador.
- Login como Franco/Sergio/otros remiteros → no ven el filtro ni cambia su vista (ya filtran por sí mismos).
- Excel exportado incluye la columna "Cargado por".

### Archivos
- `src/hooks/useRemitos.ts` (tipo)
- `src/pages/Remitos.tsx` (filtro + carga de profiles + export)
- `src/components/remitos/RemitosSimpleGrid.tsx` (columna)
