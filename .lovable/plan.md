
## Plan: Agregar botón de edición de Partes Diarios para Administradores

### Situación actual

- La vista admin (`ParteDiarioAdminView.tsx`) tiene botones de **Ver** (ojo) y **Eliminar** (papelera) para cada parte
- El formulario de edición (`ParteDiarioFormView.tsx`) está diseñado para que el empleado edite su propio parte
- No existe funcionalidad para que el admin edite partes de otros empleados

### Solución propuesta

Agregar un botón de **Editar** (lápiz) que abra un dialog modal con el formulario de edición, permitiendo al admin modificar cualquier parte diario.

### Cambios a realizar

**1. Crear componente `ParteDiarioEditDialog.tsx`**

Un dialog modal que contenga el formulario de edición adaptado para uso administrativo:

```typescript
// src/components/parte-diario/ParteDiarioEditDialog.tsx
interface ParteDiarioEditDialogProps {
  parte: ParteDiario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}
```

El formulario incluirá todos los campos del parte y permitirá modificar:
- Fecha, hora entrada/salida
- Obra y maquinaria asignada
- Horómetros, combustible, viajes
- Estado de máquina y checklist
- Campos específicos por rol (novedades, tareas, ausencias)
- Estado (borrador/completado)

**2. Actualizar `useParteDiarioAdmin.ts`**

Agregar mutación para actualizar partes:

```typescript
const updateMutation = useMutation({
  mutationFn: async ({ id, data }: { id: string; data: Partial<ParteDiario> }) => {
    const { error } = await supabase
      .from('partes_diarios')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['partes_diarios_admin'] });
    toast.success('Parte diario actualizado');
  },
});
```

**3. Modificar `ParteDiarioAdminView.tsx`**

Agregar el botón de edición en la columna de acciones de la tabla (líneas 388-411):

```tsx
// Después del botón Eye, antes del Trash2
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    setParteToEdit(parte);
  }}
>
  <Pencil className="w-4 h-4" />
</Button>
```

Agregar el estado y el dialog:

```tsx
const [parteToEdit, setParteToEdit] = useState<ParteDiario | null>(null);

// En el JSX
<ParteDiarioEditDialog
  parte={parteToEdit}
  open={!!parteToEdit}
  onOpenChange={(open) => !open && setParteToEdit(null)}
  onSave={() => setParteToEdit(null)}
/>
```

**4. Modificar `ParteDiarioCardView.tsx`**

Agregar el mismo botón de edición en la vista de tarjetas (líneas 178-200):

```tsx
// Props: agregar onEdit
interface ParteDiarioCardViewProps {
  partes: ParteDiario[];
  onView: (parte: ParteDiario) => void;
  onEdit: (parte: ParteDiario) => void;  // NUEVO
  onDelete: (parte: ParteDiario) => void;
}

// En el JSX, entre Eye y Trash2
<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(parte); }}>
  <Pencil className="w-4 h-4" />
</Button>
```

### Archivos a crear

1. `src/components/parte-diario/ParteDiarioEditDialog.tsx` - Dialog modal con formulario de edición

### Archivos a modificar

1. `src/hooks/useParteDiarioAdmin.ts` - Agregar mutación `updateParte`
2. `src/components/parte-diario/ParteDiarioAdminView.tsx` - Agregar botón editar y dialog
3. `src/components/parte-diario/ParteDiarioCardView.tsx` - Agregar botón editar

### Resultado esperado

- El admin verá un ícono de lápiz (editar) al lado del ojo (ver) y la papelera (eliminar)
- Al hacer clic, se abre un modal con todos los campos del parte editables
- Los cambios se guardan en la base de datos y la lista se actualiza automáticamente
- El admin puede cambiar el estado entre borrador y completado
