

## Cambio: formato del listado de vehículos en Gastos de Maquinaria

En `src/components/maquinarias/GastosMaquinaria.tsx` (líneas 210-221), el combobox de selección de maquinaria muestra hoy `Código - Tipo - Patente`. Lo voy a cambiar al formato pedido: **Código - Tipo - Marca - Año - Patente**.

### Cambio único en `maquinariaOptions`

```tsx
const maquinariaOptions = useMemo(() => {
  return maquinariasFiltradas
    .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
    .map((m) => {
      const codigo = m.codigo || "S/C";
      const tipo = tiposConfig[m.tipo] || m.tipo;
      const marca = m.marca || "";
      const anio = m.anio ? String(m.anio) : "";
      const patente = m.patente || "";
      const label = [codigo, tipo, marca, anio, patente].filter(Boolean).join(" - ");
      const searchValue = `${codigo} ${tipo} ${marca} ${anio} ${patente} ${m.nombre || ""}`.toLowerCase();
      return { value: m.id, label, searchValue };
    });
}, [maquinariasFiltradas]);
```

### Detalles
- Campos vacíos (sin marca, sin año o sin patente) se omiten con `filter(Boolean)` para no dejar guiones colgando tipo `"954 - Camión -  - 2018"`.
- El `searchValue` también incluye marca y año para que el buscador del combobox encuentre por cualquiera de esos términos.
- No se tocan tipos, hooks ni la lógica de filtrado por tipo de maquinaria.

### Resultado
El selector pasará de mostrar `"954 - Camión - AB123CD"` a mostrar `"954 - Camión - Mercedes - 2018 - AB123CD"`.

