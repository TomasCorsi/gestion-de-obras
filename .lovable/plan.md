

# Plan: Mejora de Parte Diario con Botones y Sistema de Borradores

## Resumen
Agregar dos botones principales ("Nuevo parte" / "Ver mis partes") y un sistema de borradores que permite a los empleados cargar datos parcialmente durante el día y completarlos después.

## Vista Previa de la Nueva Interfaz

```text
┌──────────────────────────────────────────────────────────────┐
│ 🚜 Calamina Sur                           [Juan P.] [⏻]     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Parte Diario                                             │
│  Hola, Juan (Maquinista)                                     │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │   ➕ Nuevo Parte    │  │   📋 Ver Mis Partes │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Tienes un borrador sin completar                    │  │
│  │ Fecha: 28/01/2026 - Obra: Proyecto X                   │  │
│  │ [Continuar] [Descartar]                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Cambios a Implementar

### 1. Agregar columna `estado` a la tabla `partes_diarios`

Nueva columna para diferenciar borradores de partes completados:

| Valor | Descripción |
|-------|-------------|
| `borrador` | Parte parcialmente cargado, se puede editar |
| `completado` | Parte finalizado, no editable (o con restricciones) |

### 2. Reestructurar la Página de Parte Diario

Crear tres vistas/modos:

| Modo | Descripción |
|------|-------------|
| `home` | Vista inicial con los dos botones principales |
| `form` | Formulario para crear/editar un parte |
| `list` | Lista de partes del empleado (historial completo) |

### 3. Sistema de Borradores

- Cuando el empleado guarda parcialmente → `estado = 'borrador'`
- Cuando el empleado completa el formulario → `estado = 'completado'`
- Al entrar a "Nuevo parte", verificar si hay borrador del día actual
- Mostrar alerta si existe borrador pendiente para continuar o descartar

### 4. Actualizar el Hook useParteDiario

Agregar:
- Consulta de borrador del día actual
- Función para guardar como borrador
- Función para completar un parte

## Flujo de Usuario

```text
EMPLEADO ABRE LA APP:
┌─────────────────────────────────────────────────────────────┐
│ 1. ¿Hay borrador del día de hoy?                            │
│    ├─ SÍ → Mostrar alerta con opciones [Continuar/Descartar]│
│    └─ NO → Mostrar solo los dos botones                     │
├─────────────────────────────────────────────────────────────┤
│ 2. Click "Nuevo Parte"                                      │
│    ├─ Si hay borrador → Cargar datos del borrador           │
│    └─ Si no hay → Formulario vacío                          │
├─────────────────────────────────────────────────────────────┤
│ 3. En el formulario:                                        │
│    ├─ [Guardar Borrador] → Guarda y vuelve a home           │
│    └─ [Completar Parte] → Valida, guarda como completado    │
├─────────────────────────────────────────────────────────────┤
│ 4. Click "Ver Mis Partes"                                   │
│    └─ Muestra lista completa con filtros y estado           │
└─────────────────────────────────────────────────────────────┘
```

## Archivos a Modificar/Crear

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `partes_diarios` (DB) | Migración | Agregar columna `estado` |
| `src/pages/ParteDiario.tsx` | Refactorizar | Agregar vistas home/form/list |
| `src/hooks/useParteDiario.ts` | Actualizar | Agregar lógica de borradores |
| `src/integrations/supabase/types.ts` | Auto-update | Se actualiza automáticamente |

## Sección Técnica

### Migración de Base de Datos

```sql
-- Agregar columna estado con valor por defecto 'completado'
-- para no afectar registros existentes
ALTER TABLE public.partes_diarios 
ADD COLUMN estado text NOT NULL DEFAULT 'completado';

-- Agregar constraint para valores válidos
ALTER TABLE public.partes_diarios
ADD CONSTRAINT partes_diarios_estado_check 
CHECK (estado IN ('borrador', 'completado'));
```

### Estructura del Hook Actualizado

```typescript
// useParteDiario.ts - Nuevas funciones

// Buscar borrador del día actual
const { data: borradorHoy } = useQuery({
  queryKey: ['parte_borrador', empleado?.id, fechaHoy],
  queryFn: async () => {
    const { data } = await supabase
      .from('partes_diarios')
      .select('*')
      .eq('personal_id', empleado.id)
      .eq('fecha', fechaHoy)
      .eq('estado', 'borrador')
      .maybeSingle();
    return data;
  }
});

// Guardar como borrador
const saveDraft = async (data) => {
  if (borradorHoy) {
    return updateParte({ id: borradorHoy.id, ...data, estado: 'borrador' });
  }
  return createParte({ ...data, estado: 'borrador' });
};

// Completar parte
const completeParte = async (data) => {
  if (borradorHoy) {
    return updateParte({ id: borradorHoy.id, ...data, estado: 'completado' });
  }
  return createParte({ ...data, estado: 'completado' });
};
```

### Estructura de la Página Refactorizada

```typescript
// ParteDiario.tsx - Nueva estructura

const ParteDiario = () => {
  const [view, setView] = useState<'home' | 'form' | 'list'>('home');
  const [editingParte, setEditingParte] = useState<ParteDiario | null>(null);
  const { borradorHoy, partes, saveDraft, completeParte } = useParteDiario();

  // Vista Home
  if (view === 'home') {
    return (
      <HomeView 
        borradorHoy={borradorHoy}
        onNewParte={() => setView('form')}
        onViewList={() => setView('list')}
        onContinueDraft={() => {
          setEditingParte(borradorHoy);
          setView('form');
        }}
      />
    );
  }

  // Vista Lista
  if (view === 'list') {
    return (
      <ListView 
        partes={partes}
        onBack={() => setView('home')}
        onEdit={(parte) => {
          setEditingParte(parte);
          setView('form');
        }}
      />
    );
  }

  // Vista Formulario
  return (
    <FormView
      parte={editingParte}
      onBack={() => {
        setEditingParte(null);
        setView('home');
      }}
      onSaveDraft={saveDraft}
      onComplete={completeParte}
    />
  );
};
```

### Componente HomeView

```typescript
const HomeView = ({ borradorHoy, onNewParte, onViewList, onContinueDraft }) => (
  <div className="space-y-6">
    {/* Botones principales */}
    <div className="grid grid-cols-2 gap-4">
      <Button onClick={onNewParte} className="h-24 flex-col gap-2">
        <Plus className="w-8 h-8" />
        <span>Nuevo Parte</span>
      </Button>
      <Button onClick={onViewList} variant="outline" className="h-24 flex-col gap-2">
        <ClipboardList className="w-8 h-8" />
        <span>Ver Mis Partes</span>
      </Button>
    </div>

    {/* Alerta de borrador pendiente */}
    {borradorHoy && (
      <Alert className="bg-amber-500/10 border-amber-500/50">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertDescription>
          Tienes un borrador sin completar del día de hoy
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={onContinueDraft}>Continuar</Button>
            <Button size="sm" variant="ghost">Descartar</Button>
          </div>
        </AlertDescription>
      </Alert>
    )}
  </div>
);
```

### Botones del Formulario

El formulario tendrá dos botones en la barra inferior:

```typescript
<div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
  <div className="flex gap-3 max-w-lg mx-auto">
    {/* Guardar como borrador */}
    <Button 
      variant="outline" 
      onClick={handleSaveDraft}
      className="flex-1 h-14"
    >
      <FileEdit className="w-5 h-5 mr-2" />
      Guardar Borrador
    </Button>
    
    {/* Completar parte */}
    <Button 
      onClick={handleComplete}
      className="flex-1 h-14"
    >
      <CheckCircle className="w-5 h-5 mr-2" />
      Completar Parte
    </Button>
  </div>
</div>
```

## Resultado Esperado

1. **Vista inicial limpia** con dos botones grandes y fáciles de usar en móvil
2. **Borradores automáticos** - El empleado puede guardar parcialmente a la mañana
3. **Continuación fluida** - Al volver a la app, se le ofrece continuar el borrador
4. **Historial organizado** - Lista de partes con indicador visual de estado (borrador vs completado)
5. **Interfaz 100% móvil** - Botones grandes, táctiles, optimizados para campo

