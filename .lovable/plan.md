

# Nuevo modo de carga simplificada para Remitos

## Problema
La grilla basada en `react-datasheet-grid` es compleja y no funciona bien. El usuario quiere un modo de carga más simple, similar a la edición de conceptos de servicio en certificados (`CertificadoServiceGrid`).

## Solución
Crear un nuevo componente `RemitosSimpleGrid` que use tablas HTML nativas con inputs inline (mismo patrón que `CertificadoServiceGrid`), y reemplazar el modo "grilla" actual con este nuevo componente.

## Diseño del componente `RemitosSimpleGrid`

Estructura similar a `CertificadoServiceGrid`:
- Tabla con `<Table>` de shadcn/ui
- Inputs inline en cada celda (`<Input>`, `<Select>`, `<Combobox>`)
- Botón "Agregar remito" para nuevas filas
- Botón "Guardar" para persistir cambios en batch
- Botón de eliminar fila (icono basura)
- Texto compacto (`text-xs`, `h-7`) para maximizar espacio

### Columnas (las más importantes para carga rápida):
1. **Fecha** - Input date
2. **Rem. Tercero** - Input text
3. **Rem. Local** - Input text (auto-generado)
4. **Desde** - Combobox con obras (búsqueda por nombre y número)
5. **Hasta** - Combobox con obras
6. **Tipo Material** - Select con opciones predefinidas
7. **Transporte** - Select con opciones predefinidas
8. **Vehículo** - Combobox con maquinarias
9. **Pat. Tercero** - Input text
10. **Cliente** - Combobox con clientes
11. **Viajes** - Input number
12. **Cant. Uni.** - Input number
13. **Cant. Total** - Input number (o calculado)
14. **P. Unit.** - Input number
15. **Precio Total** - Calculado, display only
16. **Eliminar** - Botón

### Archivos a crear/modificar:

1. **Crear `src/components/remitos/RemitosSimpleGrid.tsx`**
   - Componente con tabla inline editable
   - Props: `remitos`, `obras`, `maquinarias`, `clientes`, `onSave`, `generateNumero`
   - Estado local para filas nuevas/editadas/eliminadas
   - Lógica de cálculo automático de precio total
   - Scroll horizontal con `overflow-x-auto`

2. **Modificar `src/pages/Remitos.tsx`**
   - Reemplazar `RemitosDataGrid` por `RemitosSimpleGrid` en el modo grilla
   - Mantener la vista tabla existente como alternativa
   - Mantener importación CSV

### Patrón de guardado:
- Tracking de filas nuevas, editadas y eliminadas con `useRef` (mismo patrón existente)
- Botón "Guardar" que llama a `onSave` con el batch de cambios
- Toast de confirmación con resultados

