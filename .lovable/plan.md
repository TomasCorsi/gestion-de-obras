
# Plan: Transformar Presentismo en Parte Diario

## Resumen Ejecutivo
Crear una aplicación móvil integrada "Parte Diario" donde los empleados (Maquinista, Chofer, Capataz, Mecánico) registran su trabajo diario con formularios personalizados según su rol. El sistema detecta automáticamente el tipo de empleado al vincularlo con la base de datos de personal existente.

## 1. Flujo de Usuario

```text
┌─────────────────────────────────────────────────────────────┐
│                      REGISTRO EMPLEADO                       │
├─────────────────────────────────────────────────────────────┤
│  Nombre Completo: [________________]                        │
│  Legajo: [________________]                                 │
│  Email: [________________]                                  │
│  Teléfono: [________________]                               │
│  Contraseña: [________________]                             │
│                                                             │
│  → El sistema busca el legajo en la tabla "personal"        │
│  → Detecta automáticamente el ROL (Maquinista/Chofer/etc)   │
│  → Vincula el usuario auth con el registro de personal      │
│                                                             │
│              [REGISTRARME]                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PARTE DIARIO (Móvil)                     │
├─────────────────────────────────────────────────────────────┤
│  Formulario adaptado según rol detectado:                   │
│  • Maquinista → Campos de horómetro, obra, checks           │
│  • Chofer → Campos de viajes, combustible, URía             │
│  • Capataz → Vista simplificada                             │
│  • Mecánico → Vista simplificada                            │
└─────────────────────────────────────────────────────────────┘
```

## 2. Matriz de Campos por Rol

| Campo | Maquinista | Chofer | Capataz | Mecánico |
|-------|:----------:|:------:|:-------:|:--------:|
| Fecha | ✓ | ✓ | ✓ | ✓ |
| Operador (automático) | ✓ | ✓ | ✓ | ✓ |
| Hora Entrada | ✓ | ✓ | ✓ | ✓ |
| Hora Salida | ✓ | ✓ | ✓ | ✓ |
| N° Máquina/Camión | ✓ | ✓ | - | - |
| Estado máquina (OK/OBS) | ✓ | ✓ | - | - |
| Observación máquina | ✓ | ✓ | - | - |
| Obra | ✓ | - | - | - |
| Horómetro inicio | ✓ | - | - | - |
| Horómetro fin | ✓ | - | - | - |
| Combustible | ✓ | ✓ | - | - |
| Cantidad viajes | - | ✓ | - | - |
| Cantidad mov. interno | - | ✓ | - | - |
| Check filtro aire | ✓ | - | - | - |
| Check aceite motor | ✓ | ✓ | - | - |
| Check aceite hidráulico | ✓ | - | - | - |
| Check líquido refrigerante | - | ✓ | - | - |
| Check Uría | - | ✓ | - | - |

## 3. Cambios en Base de Datos

### 3.1 Modificar tabla `personal`
Agregar columna para vincular con usuario de autenticación:
```sql
ALTER TABLE public.personal 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX personal_user_id_unique ON public.personal(user_id) WHERE user_id IS NOT NULL;
```

### 3.2 Nueva tabla `partes_diarios`
```sql
CREATE TABLE public.partes_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  personal_id uuid NOT NULL REFERENCES public.personal(id),
  obra_id uuid REFERENCES public.obras(id),
  maquinaria_id uuid REFERENCES public.maquinarias(id),
  
  -- Horarios
  hora_entrada time,
  hora_salida time,
  
  -- Campos Maquinista
  horometro_inicio numeric DEFAULT 0,
  horometro_fin numeric DEFAULT 0,
  
  -- Campos Chofer
  cantidad_viajes integer DEFAULT 0,
  cantidad_movimiento_interno integer DEFAULT 0,
  
  -- Campos compartidos Maquinista/Chofer
  combustible numeric DEFAULT 0,
  estado_maquina text CHECK (estado_maquina IN ('OK', 'OBSERVACION')),
  observacion_maquina text,
  
  -- Checklist Maquinista
  check_filtro_aire boolean DEFAULT false,
  check_aceite_hidraulico boolean DEFAULT false,
  
  -- Checklist Maquinista y Chofer
  check_aceite_motor boolean DEFAULT false,
  
  -- Checklist Chofer
  check_liquido_refrigerante boolean DEFAULT false,
  check_uria boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_partes_diarios_updated_at
  BEFORE UPDATE ON public.partes_diarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.partes_diarios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Empleados pueden gestionar sus propios partes
CREATE POLICY "Employees can manage own partes"
  ON public.partes_diarios FOR ALL
  USING (
    personal_id IN (
      SELECT id FROM public.personal WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    personal_id IN (
      SELECT id FROM public.personal WHERE user_id = auth.uid()
    )
  );

-- Admin y Capataz pueden ver todos
CREATE POLICY "Admins and capataces can view all partes"
  ON public.partes_diarios FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'capataz'));
```

## 4. Diseño del Formulario Móvil

```text
┌──────────────────────────────────────┐
│  📋 PARTE DIARIO                     │
│  Hola, Juan Pérez (Maquinista)       │
├──────────────────────────────────────┤
│                                      │
│  📅 FECHA                            │
│  ┌────────────────────────────────┐  │
│  │ 28/01/2026                     │  │
│  └────────────────────────────────┘  │
│                                      │
│  🏗️ OBRA (solo Maquinista)           │
│  ┌────────────────────────────────┐  │
│  │ Seleccionar obra...       ▼   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ⏰ HORARIOS                         │
│  ┌───────────┐    ┌───────────┐      │
│  │ Entrada   │    │  Salida   │      │
│  │   07:00   │    │   15:00   │      │
│  └───────────┘    └───────────┘      │
│                                      │
│  🚜 MÁQUINA                          │
│  ┌────────────────────────────────┐  │
│  │ Buscar por código/tipo...     │  │
│  └────────────────────────────────┘  │
│                                      │
│  📊 HORÓMETRO (solo Maquinista)      │
│  ┌───────────┐    ┌───────────┐      │
│  │  Inicio   │    │    Fin    │      │
│  │  12450    │    │   12458   │      │
│  └───────────┘    └───────────┘      │
│                                      │
│  ⛽ COMBUSTIBLE (Maq/Chofer)         │
│  ┌────────────────────────────────┐  │
│  │ Litros: [      50      ]       │  │
│  └────────────────────────────────┘  │
│                                      │
│  🚚 VIAJES (solo Chofer)             │
│  ┌───────────┐    ┌───────────┐      │
│  │  Viajes   │    │ Mov.Int.  │      │
│  │     5     │    │     2     │      │
│  └───────────┘    └───────────┘      │
│                                      │
│  🔧 ESTADO MÁQUINA (Maq/Chofer)      │
│  ┌────────────────────────────────┐  │
│  │  ◉ OK      ○ OBSERVACIÓN      │  │
│  └────────────────────────────────┘  │
│                                      │
│  ✅ CHECKLIST DIARIO                 │
│  ┌────────────────────────────────┐  │
│  │ [✓] Filtro de aire (Maq)      │  │
│  │ [✓] Aceite motor (Maq+Chof)   │  │
│  │ [ ] Aceite hidráulico (Maq)   │  │
│  │ [✓] Líq. refrigerante (Chof)  │  │
│  │ [ ] Uría (Chof)               │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       💾 GUARDAR PARTE         │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

## 5. Archivos a Crear/Modificar

### Nuevos Archivos
| Archivo | Descripción |
|---------|-------------|
| `src/pages/ParteDiario.tsx` | Página principal con formulario móvil |
| `src/pages/RegistroEmpleado.tsx` | Página de registro para empleados de campo |
| `src/hooks/useParteDiario.ts` | Hook CRUD para partes_diarios |
| `src/hooks/useEmpleadoProfile.ts` | Hook para obtener perfil del empleado logueado |

### Archivos a Modificar
| Archivo | Cambio |
|---------|--------|
| `src/components/layout/Sidebar.tsx` | Cambiar "Presentismo" → "Parte Diario" |
| `src/pages/Index.tsx` | Cambiar "Presentismo" → "Parte Diario" |
| `src/App.tsx` | Actualizar rutas: `/presentismo` → `/parte-diario`, agregar `/registro-empleado` |
| `src/hooks/useAuth.tsx` | Agregar función para detectar rol desde tabla personal |

## 6. Lógica de Registro de Empleados

Al registrarse, el sistema:
1. Recibe: nombre, legajo, email, teléfono, contraseña
2. Busca en tabla `personal` por legajo
3. Si encuentra coincidencia:
   - Crea usuario en auth.users
   - Vincula `personal.user_id` con el nuevo usuario
   - Asigna rol en `user_roles` según `personal.rol`:
     - maquinista → 'maquinista'
     - chofer → 'maquinista' (mismo acceso)
     - capataz → 'capataz'
     - mecanico → 'maquinista' (mismo acceso)
4. Si NO encuentra el legajo → Error: "Legajo no encontrado. Contacte al administrador."

## 7. Sección Técnica

### Flujo de detección de rol del personal
```typescript
// useEmpleadoProfile.ts
export function useEmpleadoProfile() {
  const { user } = useAuth();
  const [empleado, setEmpleado] = useState<PersonalDB | null>(null);
  
  useEffect(() => {
    if (user) {
      // Buscar personal vinculado al user_id
      supabase
        .from('personal')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => setEmpleado(data));
    }
  }, [user]);
  
  return {
    empleado,
    rolPersonal: empleado?.rol, // 'maquinista' | 'chofer' | 'capataz' | 'mecanico'
    isMaquinista: empleado?.rol === 'maquinista',
    isChofer: empleado?.rol === 'chofer',
    isCapataz: empleado?.rol === 'capataz',
    isMecanico: empleado?.rol === 'mecanico',
  };
}
```

### Campos condicionales en formulario
```typescript
// ParteDiario.tsx
function ParteDiarioForm() {
  const { empleado, rolPersonal } = useEmpleadoProfile();
  
  const showObraField = rolPersonal === 'maquinista';
  const showHorometro = rolPersonal === 'maquinista';
  const showViajes = rolPersonal === 'chofer';
  const showCombustible = ['maquinista', 'chofer'].includes(rolPersonal);
  const showEstadoMaquina = ['maquinista', 'chofer'].includes(rolPersonal);
  
  // Checklist condicional
  const checklistItems = [
    { id: 'check_filtro_aire', label: 'Filtro de aire', roles: ['maquinista'] },
    { id: 'check_aceite_motor', label: 'Aceite motor', roles: ['maquinista', 'chofer'] },
    { id: 'check_aceite_hidraulico', label: 'Aceite hidráulico', roles: ['maquinista'] },
    { id: 'check_liquido_refrigerante', label: 'Líquido refrigerante', roles: ['chofer'] },
    { id: 'check_uria', label: 'Uría', roles: ['chofer'] },
  ].filter(item => item.roles.includes(rolPersonal));
  
  return (
    // Formulario con campos condicionales
  );
}
```

### Optimización móvil (Tailwind)
```typescript
// Inputs táctiles grandes
<Input className="h-14 text-lg" />

// Botones touch-friendly
<Button className="h-14 text-lg w-full" />

// Checkboxes grandes
<Checkbox className="h-8 w-8" />

// Radio buttons visuales
<RadioGroup className="grid grid-cols-2 gap-4">
  <RadioGroupItem 
    className="h-14 flex items-center justify-center rounded-xl border-2"
  />
</RadioGroup>
```

## 8. Resultado Esperado

- Empleados de campo se registran con su legajo
- El sistema detecta automáticamente su tipo (Maquinista/Chofer/Capataz/Mecánico)
- Cada tipo ve únicamente los campos relevantes a su trabajo
- Formulario optimizado para uso en celular con botones grandes
- Historial de partes anteriores accesible desde la misma página
- Administradores y Capataces pueden ver todos los partes desde el sistema de gestión
