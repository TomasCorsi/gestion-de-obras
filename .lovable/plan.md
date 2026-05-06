## Cambios en `src/pages/Certificados.tsx`

### 1. Eliminar pestaña "Orden de Sub Categorías"
- Quitar el `<TabsTrigger value="orden-etapas">` y el `<TabsContent value="orden-etapas">` que renderiza `EtapasOrdenTab`.
- Eliminar el componente `EtapasOrdenTab` (función al final del archivo) y el import/uso de `reorderEtapas` desde `useCertificados` en esta página.
- (`reorderEtapas` se mantiene en `useCertificados.ts` por compatibilidad pero deja de usarse aquí; opcional limpiarlo después).

### 2. Reordenar sub‑categorías (etapas) directamente en Crear/Editar certificado
En el diálogo de crear/editar, dentro de las secciones tipo **Obra** y **Mixto > Sección Obra** (donde los items se agrupan por etapa con `draftGroupedEtapa` / `draftMixtoObraGrouped`):

- En el header de cada grupo de etapa agregar dos botones flechas (↑ ↓) al lado del nombre.
- Al hacer clic:
  - Reordena las etapas localmente en `itemsDraft` (mueve todo el bloque de items de esa etapa antes/después del bloque vecino), de modo que el cambio se vea inmediatamente en pantalla y se respete al guardar/imprimir el PDF de ese certificado.
  - Además, persiste el nuevo orden globalmente llamando a `reorderEtapas` con el nuevo `etapaOrder`, para que los próximos certificados ya nazcan con ese orden.
- Botones deshabilitados en los extremos (primer grupo no sube, último no baja).

Helper interno (en el componente):
```ts
const moveEtapa = (etapa: string, dir: -1 | 1, scope: "obra" | "mixto-obra") => {
  // 1) reordena itemsDraft moviendo el bloque de la etapa
  // 2) calcula nuevo etapaOrder y llama reorderEtapas(...)
};
```

### 3. Filtros de período: reemplazar "desde/hasta" por "Mes"
- Quitar los inputs `Período desde` / `Período hasta` y los estados `filtroPeriodoDesde` / `filtroPeriodoHasta` (incluida su lógica en `certificados.filter`).
- Agregar un único filtro `filtroMes` (URL state `key: "fmes"`, default `""` = todos) usando `<Input type="month">`.
- Lógica nueva: `if (filtroMes && c.periodo !== filtroMes) return false;`
- Botón pequeño "Limpiar" al lado para resetear el mes.

### 4. Vista por defecto: tabla
- Cambiar `vistaListado` para que su `defaultValue` sea `"tabla"` en lugar de `"cards"`.
- El toggle Cards/Tabla se mantiene para que el usuario pueda cambiar manualmente.

## Archivos afectados
- `src/pages/Certificados.tsx` (única edición real).

## Notas
- No hay cambios de base de datos.
- El reordenamiento desde el diálogo usa la función `reorderEtapas` ya existente, así que el orden persiste para todos los certificados de la obra.
- La vista de cards y los demás filtros (estado, tipo, búsqueda Nº) quedan intactos.
