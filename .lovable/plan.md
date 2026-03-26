

## Plan: Mejorar buscabilidad en el formulario de Remitos

### Problema
1. Las maquinarias solo muestran código, no se puede buscar por número interno ni patente
2. Los desplegables de Tipo Material y Unidad son `Select` estáticos sin buscador

### Cambios en `src/components/remitos/RemitoQuickFormDialog.tsx`

**1. Maquinaria Combobox — mostrar y buscar por código + patente**
- Cambiar `maquinariaOptions` para que el `label` muestre `código - patente` (ej: "C01 - ABC123")
- Agregar `searchValue` que concatene código + patente + nombre para que el Combobox busque en todos los campos

**2. Reemplazar `Select` por `Combobox` en:**
- **Tipo Material** (actualmente `Select` con 23 opciones) → `Combobox` con buscador
- **Unidad** (5 opciones, `Select` está bien pero por consistencia) → `Combobox`
- **Modo Cálculo** (2 opciones) → mantener `Select`, no necesita buscador

### Detalle técnico
- El componente `Combobox` ya soporta `searchValue` para búsqueda custom
- Se eliminarán los imports de `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` si ya no se usan (Modo Cálculo aún los necesita)
- La label de maquinaria pasará de `m.codigo || m.patente` a `[m.codigo, m.patente].filter(Boolean).join(" - ")` con searchValue incluyendo nombre

