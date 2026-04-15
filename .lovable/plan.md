

## Plan: Sección de Proveedores

Crear un módulo de Proveedores siguiendo el mismo patrón que Obras: tabla con búsqueda/filtro, formulario CRUD, y diálogo de detalle.

### 1. Migración DB — Crear tabla `proveedores`

```sql
CREATE TABLE public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cuit text,
  direccion text,
  localidad text,
  telefono text,
  email text,
  contacto text,
  rubro text,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage proveedores"
  ON public.proveedores FOR ALL TO public
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view proveedores"
  ON public.proveedores FOR SELECT TO public
  USING (has_role(auth.uid(), 'maquinista'));

CREATE TRIGGER update_proveedores_updated_at
  BEFORE UPDATE ON public.proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Nuevo hook: `src/hooks/useProveedores.ts`
- CRUD con React Query (mismo patrón que `useObras`)
- Campos: nombre, cuit, dirección, localidad, teléfono, email, contacto, rubro, observaciones, activo

### 3. Nueva página: `src/pages/Proveedores.tsx`
- Copia del patrón de Obras: tabla, búsqueda, filtro activo/inactivo, formulario, detalle, eliminación
- Columnas: Nombre, CUIT, Rubro, Localidad, Teléfono, Estado (activo/inactivo)

### 4. Ruta y navegación
- `src/App.tsx` — agregar ruta `/proveedores` protegida
- `src/components/layout/AppLauncher.tsx` — agregar item "Proveedores" en la categoría correspondiente

### Archivos a crear/editar
- **Migración SQL** — tabla + RLS + trigger
- `src/hooks/useProveedores.ts` — nuevo
- `src/pages/Proveedores.tsx` — nuevo
- `src/App.tsx` — nueva ruta
- `src/components/layout/AppLauncher.tsx` — nuevo item de navegación

