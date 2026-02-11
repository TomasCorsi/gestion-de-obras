

## Plan: Mostrar rol correcto y pantalla de perfil

### Problema actual
1. El rol que se muestra en la barra de navegacion viene de la tabla `user_roles` que solo tiene 4 valores posibles (admin, capataz, maquinista, ayudante). Para un repartidor, el trigger asigna "maquinista" por defecto, lo cual es incorrecto visualmente.
2. El boton "Perfil" en el menu de usuario no hace nada.

### Solucion

#### 1. Mostrar el rol operativo real en la TopNavbar
En lugar de usar solo el `role` de `useAuth()` (que es el app_role generico), usar el `rolPersonal` de `useEmpleadoProfile()` para mostrar el rol real del empleado en la barra. Para admins sin perfil de empleado, seguir mostrando "Administrador".

**Archivo: `src/components/layout/TopNavbar.tsx`**
- Importar `useEmpleadoProfile`
- Agregar un mapa completo de labels para todos los roles de personal (maquinista, chofer, capataz, mecanico, sereno, topografo, ayudante, administrativo, repartidor_calecita)
- Priorizar `rolPersonal` sobre `role` para el label mostrado: si hay perfil de empleado, mostrar su rol real; si no (ej: admin puro), mostrar el app_role

#### 2. Crear pagina de Perfil del empleado
Una pagina simple donde el usuario pueda ver sus datos personales (solo lectura).

**Archivo nuevo: `src/pages/MiPerfil.tsx`**
- Usar `useEmpleadoProfile()` para obtener los datos
- Mostrar en cards con los campos relevantes:
  - Nombre completo, Legajo, DNI
  - Rol, Situacion laboral
  - Telefono, Email
  - Fecha de ingreso
  - Licencia y vencimiento (si aplica)
  - Banco y cuenta (si aplica)
- Solo lectura, sin edicion (para evitar problemas de seguridad)
- Estilo mobile-first consistente con el resto de la app

**Archivo: `src/App.tsx`**
- Agregar ruta `/mi-perfil` protegida

**Archivo: `src/components/layout/TopNavbar.tsx`**
- Conectar el boton "Perfil" del menu desplegable para navegar a `/mi-perfil`

### Detalle tecnico

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/TopNavbar.tsx` | Usar `useEmpleadoProfile` para mostrar rol real; navegar a /mi-perfil desde menu |
| `src/pages/MiPerfil.tsx` (nuevo) | Pagina de perfil con datos del empleado en solo lectura |
| `src/App.tsx` | Agregar ruta protegida `/mi-perfil` |

### Resultado esperado
- En la barra superior, "Sofia" vera "Repartidor Calecita" en vez de "Maquinista"
- Al tocar "Perfil" en el menu, se abre una pagina con todos sus datos personales
- Para admins sin perfil de empleado, se sigue mostrando "Administrador"
