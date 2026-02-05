

## Plan: Crear rol "Repartidor Calecita" con tabla de cargas separada

### Resumen

El "Repartidor Calecita" es un rol especial que distribuye combustible a las máquinas en las obras. Sus registros de carga de combustible serán almacenados en una **tabla completamente separada** de `cargas_combustible` (que se usa para remitos físicos).

---

### Cambios en Base de Datos

**1. Agregar rol al enum `rol_personal`**

```sql
ALTER TYPE rol_personal ADD VALUE 'repartidor_calecita';
```

**2. Crear nueva tabla `cargas_combustible_repartidor`**

Esta tabla es independiente de `cargas_combustible` y almacena las cargas registradas por el repartidor:

```sql
CREATE TABLE public.cargas_combustible_repartidor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parte_diario_id uuid REFERENCES partes_diarios(id) ON DELETE CASCADE NOT NULL,
  fecha date NOT NULL,
  operador_id uuid REFERENCES personal(id) ON DELETE SET NULL,
  maquinaria_id uuid REFERENCES maquinarias(id) ON DELETE SET NULL,
  obra_id uuid REFERENCES obras(id) ON DELETE SET NULL,
  litros numeric NOT NULL DEFAULT 0,
  horas numeric DEFAULT 0,
  km numeric DEFAULT 0,
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cargas_combustible_repartidor ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_cargas_combustible_repartidor_updated_at
  BEFORE UPDATE ON public.cargas_combustible_repartidor
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**3. Crear políticas RLS**

```sql
-- Admins y capataces pueden gestionar todas las cargas
CREATE POLICY "Admins and capataces can manage cargas_repartidor"
ON public.cargas_combustible_repartidor FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'capataz'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'capataz'::app_role)
);

-- Repartidor puede gestionar las cargas de sus propios partes
CREATE POLICY "Repartidor can manage own cargas"
ON public.cargas_combustible_repartidor FOR ALL
USING (
  parte_diario_id IN (
    SELECT id FROM partes_diarios 
    WHERE personal_id IN (
      SELECT id FROM personal WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  parte_diario_id IN (
    SELECT id FROM partes_diarios 
    WHERE personal_id IN (
      SELECT id FROM personal WHERE user_id = auth.uid()
    )
  )
);

-- Maquinistas pueden ver las cargas (solo lectura)
CREATE POLICY "Maquinistas can view cargas_repartidor"
ON public.cargas_combustible_repartidor FOR SELECT
USING (has_role(auth.uid(), 'maquinista'::app_role));
```

---

### Cambios en Frontend

**1. Actualizar tipos y constantes de roles**

Agregar `repartidor_calecita` en:
- `src/components/parte-diario/ParteDiarioFormView.tsx` (ROL_LABELS y lógica de visibilidad)
- `src/pages/ParteDiario.tsx` (ROL_LABELS)

**2. Crear hook `useCargasRepartidor.ts`**

Nuevo hook para gestionar las cargas del repartidor:

```typescript
// src/hooks/useCargasRepartidor.ts
interface CargaRepartidor {
  id: string;
  parte_diario_id: string;
  fecha: string;
  operador_id: string | null;
  maquinaria_id: string | null;
  obra_id: string | null;
  litros: number;
  horas: number;
  km: number;
  observaciones: string | null;
  // Relations
  operador?: { nombre: string; apellido: string };
  maquinaria?: { codigo: string; tipo: string };
  obra?: { nombre: string };
}
```

**3. Crear componente `CargaCombustibleRepartidorDialog.tsx`**

Modal para agregar/editar cada carga con los campos:
- Fecha (default: fecha del parte)
- Operador (Combobox conectado a `personal`)
- Maquinaria (Combobox conectado a `maquinarias`)
- Litros (numérico, requerido)
- Horas (horómetro)
- Km
- Obra/Ubicación (Combobox conectado a `obras`)
- Observaciones

**4. Crear componente `CargasCombustibleRepartidorList.tsx`**

Tabla que muestra las cargas agregadas con:
- Columnas: Fecha, Operador, Máquina, Litros, Horas, Km, Obra, Observaciones
- Botones de editar/eliminar por fila
- Totales al final (suma de litros)

**5. Modificar `ParteDiarioFormView.tsx`**

Agregar sección especial para rol `repartidor_calecita`:
- Detectar si `rol === 'repartidor_calecita'`
- Mostrar campos: Fecha, Rol, Horario entrada/salida
- Botón "Agregar Carga de Combustible"
- Listado de cargas (`CargasCombustibleRepartidorList`)
- Campo Novedades (textarea)
- Campo Observaciones/Inconvenientes (textarea)

---

### Flujo de Usuario

```text
1. Repartidor inicia sesión y abre Parte Diario
2. Sistema detecta rol = 'repartidor_calecita'
3. Muestra formulario especializado con:
   - Fecha (auto)
   - Rol: "Repartidor Calecita"
   - Horario entrada/salida
   - Botón [+ Agregar Carga de Combustible]
   - Lista de cargas agregadas
   - Novedades
   - Observaciones/Inconvenientes

4. Al hacer clic en "Agregar Carga":
   - Abre modal con formulario
   - Completa: operador, máquina, litros, horas, km, obra, obs
   - Guarda -> carga aparece en lista

5. Puede agregar múltiples cargas, editarlas o eliminarlas

6. Al guardar borrador o completar:
   - Se guarda/actualiza el parte diario
   - Las cargas se persisten en `cargas_combustible_repartidor`
   - Cada carga queda vinculada al parte_diario_id
```

---

### Archivos a Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/hooks/useCargasRepartidor.ts` | Hook para CRUD de cargas del repartidor |
| `src/components/parte-diario/CargaCombustibleRepartidorDialog.tsx` | Modal para agregar/editar carga individual |
| `src/components/parte-diario/CargasCombustibleRepartidorList.tsx` | Tabla con listado de cargas y acciones |

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Base de datos | Crear tabla y RLS |
| `src/components/parte-diario/ParteDiarioFormView.tsx` | Agregar seccion especializada para repartidor |
| `src/pages/ParteDiario.tsx` | Agregar rol a ROL_LABELS |
| `src/hooks/useEmpleadoProfile.ts` | Agregar `isRepartidorCalecita` (opcional) |

---

### Consideraciones Tecnicas

- Las cargas se guardan directamente en la BD cuando el usuario las agrega en el modal
- Si el parte es borrador, las cargas quedan asociadas al parte_diario_id
- Si el usuario elimina el parte, las cargas se eliminan en cascada (ON DELETE CASCADE)
- La tabla `cargas_combustible` existente NO se modifica
- Admin puede ver todas las cargas en el detalle del parte diario

