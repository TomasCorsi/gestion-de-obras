

## Clientes: Nueva seccion y asignacion a Obras

### Resumen
Se va a crear un modulo completo de **Clientes** con su propia seccion en el sidebar, y se va a vincular cada obra con un cliente. Esto permite que un mismo cliente tenga multiples obras en distintos lugares.

---

### Cambios en la base de datos

**1. Crear tabla `clientes`:**

```text
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cuit text,
  direccion text,
  localidad text,
  telefono text,
  email text,
  contacto text,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and capataces can manage clientes"
  ON public.clientes FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'));

CREATE POLICY "Maquinistas can view clientes"
  ON public.clientes FOR SELECT
  USING (has_role(auth.uid(), 'maquinista'));
```

**2. Agregar columna `cliente_id` a `obras`:**

```text
ALTER TABLE public.obras
  ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
```

---

### Nuevos archivos

**1. `src/hooks/useClientes.ts`**
Hook con CRUD completo para clientes, siguiendo el mismo patron de `useObras.ts`:
- Tipos: `ClienteDB`, `ClienteForm`
- Query: `fetchClientes` con react-query
- Mutations: `createCliente`, `updateCliente`, `deleteCliente`

**2. `src/pages/Clientes.tsx`**
Pagina completa de gestion de clientes, siguiendo el mismo patron visual de `Obras.tsx`:
- Barra de busqueda y filtro por estado (activo/inactivo)
- Tabla con columnas: Nombre, CUIT, Contacto, Telefono, Email, Obras (cantidad)
- Dialogs de crear/editar, ver detalle, y confirmar eliminacion
- Campos del formulario: nombre*, CUIT, direccion, localidad, telefono, email, contacto (persona de referencia), observaciones

---

### Archivos a modificar

**1. `src/hooks/useObras.ts`**
- Agregar `cliente_id` a `ObraDB`, `ObraForm` y `ObraWithRelations`
- Incluir join con `clientes` en la query: `cliente:clientes(id, nombre)`
- Pasar `cliente_id` en create/update

**2. `src/pages/Obras.tsx`**
- Importar `useClientes` para obtener la lista de clientes
- Agregar selector de cliente en el formulario de crear/editar obra
- Mostrar nombre del cliente en la tabla y en el detalle de obra

**3. `src/App.tsx`**
- Agregar lazy import de `Clientes`
- Agregar ruta `/clientes` protegida para rol admin

**4. `src/components/layout/Sidebar.tsx`**
- Agregar item "Clientes" al menu con icono `Users` (o `ContactRound`), ubicado debajo de "Obras"
- Roles: admin, capataz

**5. `src/utils/generateCertificadoPDF.ts`**
- Incluir datos del cliente en el encabezado del PDF (nombre, CUIT) si la obra tiene cliente asignado

---

### Detalle tecnico

**Estructura de la tabla clientes:**

| Campo | Tipo | Requerido |
|---|---|---|
| nombre | text | Si |
| cuit | text | No |
| direccion | text | No |
| localidad | text | No |
| telefono | text | No |
| email | text | No |
| contacto | text | No |
| observaciones | text | No |
| activo | boolean | Si (default true) |

**Relacion obras-clientes:**
- Una obra tiene 0 o 1 cliente (`cliente_id` nullable)
- Un cliente puede tener N obras
- Si se elimina un cliente, las obras quedan con `cliente_id = NULL`

**Archivos nuevos:**
1. `src/hooks/useClientes.ts`
2. `src/pages/Clientes.tsx`

**Archivos a modificar:**
1. `src/hooks/useObras.ts`
2. `src/pages/Obras.tsx`
3. `src/App.tsx`
4. `src/components/layout/Sidebar.tsx`
5. `src/utils/generateCertificadoPDF.ts`
6. Migracion SQL

