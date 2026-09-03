# Avance y cobranzas dentro del Tablero

Hoy el avance de obra, los certificados y los pagos sólo se ven en Obras > "Avance y certificados" (diálogo). El tablero muestra únicamente Cotizado / Gastado / Beneficio, por eso no aparece nada de avance ni pagos ahí.

## Qué se agrega al tablero (por obra en pantalla)

1. **Franja de Rentabilidad ampliada**: junto a Cotizado / Gastado / Beneficio se suman dos bloques:
   - **Certificado**: total certificado de la obra y % sobre lo cotizado.
   - **Cobrado**: total pagado, % cobrado y saldo pendiente.

2. **Barra de avance de obra**: debajo de la barra de consumo de gastos, una segunda barra con el **% de avance general** (ponderado por monto de los conceptos con cantidad contratada cargada), con leyenda "X% de avance certificado".

3. **Nueva tarjeta en la grilla de gráficos**: "Certificados y cobranzas" con barras mensuales **Certificado vs Cobrado** (mismos datos que la pestaña de Obras), y en modo TV con tipografía ampliada.

4. Si la obra no tiene certificados cargados, los bloques muestran "Sin certificados" en lugar de ceros.

## Notas de datos (verificadas)

- POLO INDUSTRIAL EZEIZA 2: 3 certificados por $1.118M, pagos por $1.118M, 38 de 45 conceptos con cantidad contratada cargada -> el avance se calcula bien.
- Vista Lagos: 13 certificados pero sólo 1 de 23 conceptos con cantidad total cargada -> el % de avance saldrá parcial hasta cargar esas cantidades desde Obras > Avance.

## Detalles técnicos

- Nuevo hook `useTableroAvance.ts` (o reutilizar `useAvanceObra`) consultando por `obraId` de la obra en pantalla: `certificados`, `certificado_items`, `certificado_conceptos`, `certificado_pagos`; devuelve totalCertificado, totalCobrado, saldo, avanceGeneral y serie mensual.
- `TableroVista.tsx`: pasa el resultado a `ObraDashboard` como prop `avance`.
- `ObraDashboard.tsx`: sólo cambios de presentación — bloques extra en la franja de rentabilidad, segunda barra de progreso y un `ChartCard` nuevo con `BarChart` (certificado/cobrado) reutilizando los estilos existentes.
- Sin cambios de base de datos.
