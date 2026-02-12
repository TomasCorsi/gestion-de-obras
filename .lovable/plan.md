

## Agregar Certificados al App Launcher

### Problema
El modulo "Certificados" existe en las rutas y en el sidebar, pero no fue agregado a la grilla del App Launcher, que es la pantalla principal de navegacion.

### Solucion
Agregar la entrada de Certificados en el array `appCategories` dentro de `src/components/layout/AppLauncher.tsx`, en la categoria "Operaciones" (junto a Cotizaciones, que es donde tiene mas sentido).

### Cambios

**Archivo: `src/components/layout/AppLauncher.tsx`**

1. Importar el icono `Award` de lucide-react (el mismo que usa el sidebar para Certificados).
2. Agregar un nuevo item en la categoria "Operaciones", despues de Cotizaciones:
   - Label: "Certificados"
   - Path: `/certificados`
   - Color: `bg-blue-400` (variacion de azul para mantener coherencia con la categoria)
   - Roles: `['admin']`
   - Icono: `Award`

No se requieren otros cambios -- las rutas y permisos ya estan configurados correctamente.

