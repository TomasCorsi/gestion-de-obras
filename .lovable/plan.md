# Tablero: rentabilidad protagonista, sin gráficos

## Qué cambia

1. **Se sacan todos los gráficos del tablero de obra**: la serie diaria de la métrica, el acumulado, la torta de gastos por categoría y las barras de materiales/horas dejan de dibujarse con Recharts.
2. **La tarjeta de Rentabilidad vuelve a su versión grande**, centrada en la pantalla y con más aire: importes enteros (Cotizado / Gastado / Beneficio) con su equivalente en millones, badge de margen, barra de consumo, chips de Anticipo / Certificado / Cobrado y el avance de obra con número grande y barra gruesa. Al no competir con los gráficos, ocupa el centro del tablero con tipografías más grandes (y aún mayores en modo TV).
3. **Abajo de todo, dos vistas en texto**:
   - **Materiales movidos**: lista de materiales (Tosca, Tierra, Desmonte, etc.) con m³ del período, viajes y el acumulado histórico al costado.
   - **Horas por tipo de máquina**: lista por tipo con cantidad de máquinas y horas del período.
   Se muestran como filas legibles (rótulo a la izquierda, valores a la derecha, barra de proporción fina), en dos columnas en pantallas anchas y apiladas en móvil.

Los KPIs de arriba (movimientos, m³, horas, gastos, litros, maquinaria, personal, viajes) se mantienen igual.

## Estructura resultante

```text
Encabezado de obra
KPIs principales (4)
KPIs secundarios (4)
RENTABILIDAD DE LA OBRA  (grande, centrada)
Materiales movidos        |  Horas por tipo de máquina
```

## Detalles técnicos

- `src/components/dashboard/ObraDashboard.tsx`
  - Eliminar el bloque de gráficos completo (contenedor `grid-cols-1 lg:grid-cols-3` con `ChartCard`), el componente `ChartCard`, `tooltipStyle`, `armarGastos`, `GASTO_COLORS`, `CATEGORIA_LABEL`/`nombreCategoria`, los cálculos `data`/`dataAcum`/`total`/`gastos`, y todas las importaciones de `recharts`.
  - Mantener `armarMateriales`, `materialesHist` y `obra.horasPorTipoMaquina` para las nuevas listas.
  - Rentabilidad: mismo cálculo (`cotizado`, `gastadoHistorico`, `beneficio`, `margen`, `consumido`, `anticipoCobrado`, `cobradoTotal`, `saldoPendiente`), sólo cambia el layout: `max-w-5xl mx-auto w-full`, padding mayor y tamaños tipo `text-2xl`/`text-5xl` (TV).
  - Nuevo bloque final con dos `Card` simples (sin Recharts) renderizando filas de materiales y de horas por tipo, con estado vacío ("Sin materiales registrados" / "Sin horas registradas").
  - Las props `metrica`, `serie`, `loadingSerie` quedan sin uso en el render; se conservan en la interfaz para no romper llamadores, o se limpian junto con `TableroVista` si no se usan en otro lado.
- `src/pages/Dashboard.tsx`: sin cambios de datos; se revisa la altura mínima del contenedor ahora que no hay gráficos que necesiten piso de altura.
- Sin cambios en hooks, consultas ni lógica de negocio.
