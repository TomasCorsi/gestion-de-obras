
# Plan: Corrección de Vulnerabilidades de Seguridad en Tabla Personal

## Resumen del Problema

Se han identificado **3 vulnerabilidades críticas** en la tabla `personal`:

### 1. Exposición Pública de Datos Sensibles (CRÍTICO)
- La política `Allow public legajo lookup for registration` permite SELECT con condición `true`
- Expone **68 registros** con: DNI, emails, teléfonos, cuentas bancarias, sueldos
- **Riesgo**: Robo de identidad, fraude financiero, filtración de sueldos no declarados

### 2. Escalación de Privilegios vía UPDATE (ALTO)
- La política `Users can link their own personal record` permite a cualquier usuario autenticado vincular su ID a registros sin user_id
- **66 registros** vulnerables a ser "reclamados" por atacantes
- **Riesgo**: Un atacante podría crear cuenta y vincularse a un empleado existente

### 3. Datos Financieros Sin Protección (ALTO)
- Columnas `sueldo`, `sueldo_negro`, `banco`, `numero_cuenta` visibles públicamente
- **62 registros** con información bancaria expuesta

---

## Solución Propuesta

### Enfoque: Vista Segura + Políticas Restrictivas

Crear una vista que solo exponga los campos mínimos necesarios para el registro, y restringir el acceso directo a la tabla base.

---

## Cambios en Base de Datos

### 1. Crear Vista Segura para Lookup de Legajo

```sql
-- Vista que solo expone legajo, id y si está vinculado (para registro)
CREATE VIEW public.personal_legajo_lookup
WITH (security_invoker = on) AS
SELECT 
  id,
  legajo,
  rol,
  (user_id IS NOT NULL) as ya_vinculado
FROM public.personal;

-- Comentario explicativo
COMMENT ON VIEW public.personal_legajo_lookup IS 
  'Vista segura para validar legajos durante registro de empleados. No expone datos sensibles.';
```

### 2. Actualizar Políticas RLS de la Tabla Personal

```sql
-- ELIMINAR política pública de SELECT
DROP POLICY IF EXISTS "Allow public legajo lookup for registration" ON public.personal;

-- ELIMINAR política vulnerable de UPDATE
DROP POLICY IF EXISTS "Users can link their own personal record" ON public.personal;

-- NUEVA política: Solo admins y capataces ven datos completos
-- (Ya existe: "Admins and capataces can manage personal")

-- NUEVA política: Empleados pueden ver su propio registro
CREATE POLICY "Employees can view own record"
ON public.personal
FOR SELECT
USING (user_id = auth.uid());

-- NUEVA política: Empleados pueden actualizar campos limitados de su registro
CREATE POLICY "Employees can update own contact info"
ON public.personal
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 3. Política para Vista de Lookup

```sql
-- Habilitar RLS en la vista (heredada de tabla base por security_invoker)
-- Crear política que permita SELECT público SOLO en la vista
CREATE POLICY "Public can lookup legajo"
ON public.personal_legajo_lookup
FOR SELECT
USING (true);
```

### 4. Función Segura para Vinculación

```sql
-- Función que valida y vincula de forma segura
CREATE OR REPLACE FUNCTION public.link_personal_to_user(
  p_legajo TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  personal_id UUID,
  rol rol_personal,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personal_id UUID;
  v_rol rol_personal;
  v_existing_user_id UUID;
BEGIN
  -- Buscar el registro de personal
  SELECT id, rol, user_id 
  INTO v_personal_id, v_rol, v_existing_user_id
  FROM public.personal
  WHERE legajo = p_legajo;

  -- Validar que existe
  IF v_personal_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::rol_personal, 'Legajo no encontrado';
    RETURN;
  END IF;

  -- Validar que no está vinculado
  IF v_existing_user_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::rol_personal, 'Este legajo ya tiene cuenta asociada';
    RETURN;
  END IF;

  -- Vincular
  UPDATE public.personal
  SET user_id = p_user_id
  WHERE id = v_personal_id;

  RETURN QUERY SELECT true, v_personal_id, v_rol, NULL::TEXT;
END;
$$;
```

---

## Cambios en Código

### 1. src/pages/RegistroEmpleado.tsx

Actualizar para usar la vista segura y la función de vinculación:

```typescript
// Cambiar consulta de búsqueda
const { data: personal, error: searchError } = await supabase
  .from('personal_legajo_lookup')  // <- Vista segura
  .select('id, legajo, rol, ya_vinculado')
  .eq('legajo', formData.legajo.trim())
  .maybeSingle();

// Validar si ya está vinculado
if (personal?.ya_vinculado) {
  setError("Este legajo ya tiene una cuenta asociada.");
  return;
}

// Usar función segura para vincular
const { data: linkResult, error: linkError } = await supabase
  .rpc('link_personal_to_user', {
    p_legajo: formData.legajo.trim(),
    p_user_id: authData.user.id
  });
```

### 2. src/hooks/useEmpleadoProfile.ts

Actualizar auto-link para usar la función segura:

```typescript
// Reemplazar UPDATE directo por función RPC
if (unlinkedPersonal) {
  const { data: linkResult, error: linkError } = await supabase
    .rpc('link_personal_to_user', {
      p_legajo: legajo,
      p_user_id: user.id
    });

  if (linkResult?.[0]?.success) {
    // Refetch con datos actualizados
    const { data: linkedData } = await supabase
      .from('personal')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    data = linkedData;
  }
}
```

---

## Resumen de Cambios

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ANTES (VULNERABLE)                               │
├─────────────────────────────────────────────────────────────────────┤
│  Tabla personal: SELECT público (TODOS los campos)                  │
│  - DNI, Email, Teléfono, Banco, Cuenta, Sueldos expuestos          │
│  - 68 registros con datos sensibles públicos                        │
│  - UPDATE permite reclamar cualquier registro sin user_id           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    DESPUÉS (SEGURO)                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Vista personal_legajo_lookup: Solo id, legajo, rol, ya_vinculado  │
│  - Datos sensibles NUNCA expuestos públicamente                     │
│  - Tabla base: solo acceso para admins/capataces/propietario       │
│  - Vinculación via función SECURITY DEFINER validada               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Orden de Implementación

1. **Migración DB**: Crear vista, eliminar políticas vulnerables, crear nuevas políticas, crear función RPC
2. **RegistroEmpleado.tsx**: Usar vista segura y función RPC
3. **useEmpleadoProfile.ts**: Usar función RPC para auto-link
4. **Verificar**: Probar registro y acceso con diferentes roles
