

## Rediseño: Vista de Gastos por Vehículo

Voy a rediseñar la pestaña **Gastos** del módulo de Maquinarias para hacerla más prolija, organizada y útil, agregando información que hoy no se muestra (ubicación actual del vehículo, último operador, KM/Horas, último parte) y reordenando todo en bloques jerárquicos.

### 1. Nueva sección "Ficha del Vehículo" (encabezado destacado)

Al seleccionar una maquinaria, aparece una **card hero** arriba con la identidad y el estado operativo en tiempo real:

- **Lado izquierdo**: ícono grande del tipo + Código + Tipo + Marca/Modelo + Año + Patente + Estado (badge color: operativa/mantenimiento/inactiva/en_uso).
- **Lado derecho (mini-stats inline)**:
  - 📍 **Última obra** (del último parte diario) + fecha de ese parte
  - 👤 **Último operador** (nombre del personal del último parte)
  - 🛣️ **KM acumulados** o ⏱️ **Horas acumuladas** (según el tipo: camión/auto/camioneta = km; resto = horas)
  - 📅 **Último parte registrado** (dd/mm/yyyy)

Esta data sale de la query `partes_diarios_gastos` que ya existe — solo agrego `obra_id` y join con `obras(nombre)`, y tomo el primer registro (que ya viene ordenado desc por fecha).

### 2. KPIs financieros reorganizados (4 cards en una fila)

Reemplazo las 3 cards actuales por 4 más compactas y simétricas:

| Combustible | Remitos / Viajes | Mantenimientos | **Gasto Total** |
|---|---|---|---|
| $ + litros + N° cargas | $ + N° remitos + N° viajes | $ + N° servicios | $ destacado en rojo |

El "Gasto Total" deja de ser una banda separada y se integra como cuarta card con borde rojo y tipografía más grande, eliminando el bloque rojo grande de abajo que se ve desbalanceado.

### 3. Bloque de "Próximo Mantenimiento" (solo si aplica)

Se mantiene la alerta amber ya existente pero se mueve **junto a la ficha del vehículo** (parte superior derecha) en vez de quedar suelta en el medio, para que sea lo primero que el operador vea.

### 4. Gráfico de evolución (sin cambios estructurales, solo estilo)

- Conserva el `BarChart` apilado (Combustible + Mantenimiento) por mes.
- Agrego una línea o area de "Remitos" para que el gráfico también incluya esa categoría (hoy solo muestra 2 de 3 tipos).
- Altura reducida a 240px para que no domine la vista.

### 5. Tabla "Detalle de Gastos" mejorada

Agrego dos columnas nuevas y reordeno:

| Fecha | Tipo | Descripción | **Operador** | Obra | Costo |
|---|---|---|---|---|---|

- **Operador**: para cada fila se busca en `operadorPorFecha` (Map ya existente) — aplica a combustible y remitos.
- Filas hover con highlight sutil.
- Filas alternadas (zebra) para legibilidad en listas largas.
- Sticky header al hacer scroll.
- Badge de tipo en formato más compacto (sin fondo sólido, solo borde).

### 6. Filtros más limpios (parte superior)

- Reorganizo en una sola fila: `[Tipo] [Maquinaria (combobox)] [Período (mes)] [Limpiar] · · · [Exportar]`.
- El selector "Exportar" se alinea a la derecha.
- Padding y separación consistente (gap-3).

### Detalles técnicos

**Archivo único modificado**: `src/components/maquinarias/GastosMaquinaria.tsx`

- Extender query `partes_diarios_gastos`: agregar `obra_id, obras:obra_id (nombre)` al `select`.
- Crear nuevo `useMemo` `vehicleStatus` que devuelve: `{ ultimaObra, ultimoOperador, ultimoParteFecha, kmActual, horasActual }` tomando el primer registro de `partesDiarios`.
- Determinar unidad (km vs horas) con: `["camion", "auto", "camioneta"].includes(maquinaria.tipo) ? "km" : "horas"` — consistente con el fix anterior del módulo Maquinarias.
- En la tabla `Detalle de Gastos`, agregar columna `Operador` haciendo lookup `operadorPorFecha.get(gasto.fecha) ?? "—"`.
- Mantener exportación PDF/Excel funcionando (no se tocan esas funciones).

### Qué NO se cambia

- Hooks de datos (`useMaquinarias`, `useCargasRepartidorAll`, `useRemitos`, `useMantenimientos`).
- Lógica de cálculo de costos y filtros por fecha.
- Funciones de exportación (Excel/PDF).
- Sincronización de KM/horas con partes diarios (ya funciona vía trigger).

### Resultado visual

```text
┌─────────────────────────────────────────────────────────────────┐
│ [Filtros: Tipo ▾] [Maquinaria ▾] [Período ▾] [Limpiar]  [Exportar▾] │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────── FICHA DEL VEHÍCULO ─────────────┐ ┌─ Próx. Mant.─┐│
│ │ 🚛 709 · Topador · Caterpillar · 2018 · EZJ39│ │ ⚠ 15/05/2026 ││
│ │ Estado: ● Operativa                          │ │ a 5.200 hr   ││
│ │ 📍 Ceamse Tristán Suárez · 20/04/2026        │ └──────────────┘│
│ │ 👤 Juan Pérez · ⏱ 4.821 hr · Últ. parte 20/04│                 │
│ └──────────────────────────────────────────────┘                 │
├─────────────────────────────────────────────────────────────────┤
│ [Combustible $4.857.255 · 2223L]  [Remitos $0 · 0/0]            │
│ [Mantenim. $0 · 1 serv.]          [GASTO TOTAL $4.857.255]      │
├─────────────────────────────────────────────────────────────────┤
│ Evolución mensual (gráfico apilado, 240px)                      │
├─────────────────────────────────────────────────────────────────┤
│ Detalle: Fecha │ Tipo │ Descripción │ Operador │ Obra │ Costo   │
└─────────────────────────────────────────────────────────────────┘
```

