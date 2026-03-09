

# Agregar botón con formulario rápido para cargar remitos

## Cambios

### 1. Crear componente `src/components/remitos/RemitoQuickFormDialog.tsx`
Dialog con formulario compacto que incluye todos los campos del remito en un layout de 2-3 columnas para carga ágil:
- Fecha, Remito Tercero, Remito Local
- Desde, Hasta (combobox con obras)
- Tipo Material (select), Tipo Transporte (select/combobox)
- Maquinaria (combobox) o Patente Tercero
- Cliente (combobox)
- Cantidad Viajes, Cantidad, Unidad, Precio Unitario, Precio Total
- Proveedor, Observaciones
- Cálculo automático de precio total según modo (viajes × unitario o cantidad × unitario)
- Al guardar, llama a `createRemito` y cierra el dialog

### 2. Modificar `src/pages/Remitos.tsx`
- Agregar estado `formOpen` para controlar el dialog
- Agregar botón "Nuevo Remito" con ícono `Plus` junto al botón Importar
- Renderizar `RemitoQuickFormDialog` pasando obras, maquinarias, clientes, y la función `createRemito`

### Archivos
- **Crear**: `src/components/remitos/RemitoQuickFormDialog.tsx`
- **Editar**: `src/pages/Remitos.tsx`

