
## Mostrar costos y totales sin filtro de mes (vista de todos los meses)

### Diagnóstico

El problema central está en `usePreciosMes`: solo carga precios cuando hay un mes seleccionado (`enabled: !!mes`). Cuando el usuario ve "Todos los meses", no hay precios disponibles y por lo tanto:
- Las columnas "Precio U." y "Costo" muestran "Sin precio" en todas las filas
- El total del período no aparece
- El KPI de "Costo Total" muestra el promedio en lugar de un número en pesos

### Solución

**Nuevo hook `usePreciosTodos`**: Trae todos los registros de `precios_productos_mes` del año seleccionado (sin filtrar por mes). Devuelve un mapa indexado por `"mes-producto"` para que cada carga pueda buscar su precio correspondiente.

**Lógica de cálculo por carga**: La función `getPrecioForCarga` debe extraer el mes de la fecha de cada entrega y buscarlo en el mapa completo cuando no hay mes seleccionado.

**Panel de precios**: Se mantiene igual, requiriendo un mes específico para editar. Cuando no hay mes seleccionado, muestra el mensaje actual.

---

### Cambios técnicos

#### 1. `src/hooks/usePreciosMes.ts` — agregar nueva función exportada

Se agrega `usePreciosTodos(anio)`:

```typescript
export function usePreciosTodos(anio: number) {
  const { data: precios = [] } = useQuery({
    queryKey: ["precios_productos_mes_todos", anio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("precios_productos_mes")
        .select("*")
        .eq("anio", anio);
      if (error) throw error;
      return data as PrecioProductoMes[];
    },
  });

  // Mapa indexado por "mes-producto" → precio
  const preciosPorMesProducto: Record<string, number> = {};
  for (const p of precios) {
    preciosPorMesProducto[`${p.mes}-${p.producto}`] = p.precio_unitario;
  }

  return { preciosPorMesProducto };
}
```

#### 2. `src/components/gastos/CombustibleRepartidorTab.tsx` — usar precios de todos los meses

**Importar y usar `usePreciosTodos`:**

```typescript
const { preciosPorMesProducto } = usePreciosTodos(year);
```

**Actualizar `getPrecioForCarga`** para que cuando no hay filtro de mes específico, extraiga el mes de la fecha de cada carga y busque en `preciosPorMesProducto`:

```typescript
const getPrecioForCarga = (carga: typeof filtered[0]) => {
  const producto = carga.tipo_producto || "combustible";
  
  if (mes) {
    // Mes específico seleccionado → usa los precios ya cargados del mes
    return preciosPorProducto[producto];
  }
  
  // Vista de todos los meses o filtro por día: buscar precio según la fecha de la carga
  const fechaMes = parseInt(carga.fecha.split("-")[1], 10);
  return preciosPorMesProducto[`${fechaMes}-${producto}`];
};
```

Esto funciona para todos los escenarios:
- Filtro por mes → usa `preciosPorProducto` (cargado por `usePreciosMes`)
- Sin filtro (todos los meses) → usa `preciosPorMesProducto` con la fecha de cada carga
- Filtro por día exacto → usa `preciosPorMesProducto` con el mes de la fecha del día

### Resultado esperado

| Escenario | Antes | Después |
|---|---|---|
| Filtro por mes | ✅ Muestra costos | ✅ Sin cambios |
| Sin filtro (todos) | ❌ Sin precio en todas | ✅ Cada fila usa el precio de su mes |
| Filtro por día | ⚠️ Usa precio del mes seleccionado | ✅ Usa precio del mes del día filtrado |
| Total del período | ❌ No aparece sin mes | ✅ Suma todos los que tienen precio configurado |

### Archivos a modificar

1. **`src/hooks/usePreciosMes.ts`** — agregar `usePreciosTodos` al final del archivo
2. **`src/components/gastos/CombustibleRepartidorTab.tsx`** — importar `usePreciosTodos`, usarlo en el componente y actualizar `getPrecioForCarga`
