# Gráficos del tablero: recuperar altura

## Qué está pasando

El tablero de una obra se arma como una columna de altura fija (en la app `100vh - 11rem`, en TV `100vh`). Todo lo de arriba —encabezado, 4 KPIs principales, 4 KPIs secundarios y la tarjeta de Rentabilidad— está marcado como "no se encoge", y los gráficos ocupan sólo lo que sobra. Como la tarjeta de Rentabilidad creció (bloques de Cotizado/Gastado/Beneficio + barra de consumo + Anticipo/Certificado/Cobrado + Avance grande), ya casi no queda espacio: los gráficos quedan aplastados a unos pocos píxeles y sólo se ve el título y el eje, como en la captura.

## Qué propongo

### 1. Compactar la tarjeta de Rentabilidad
Misma información, menos alto:
- Cotizado / Gastado / Beneficio en una fila de tres bloques más bajos (importe entero en una línea, el "en millones" al lado y no debajo).
- Barra de consumo más fina y su texto en la misma línea.
- Anticipo / Certificado / Cobrado total pasan a ser chips en una sola fila compacta (rótulo chico + importe), no tarjetas de tres renglones.
- Avance de obra: el número grande se mantiene, pero en la misma fila que los chips en pantallas anchas, con la barra al lado.

Objetivo: que la tarjeta pase de ~280 px a ~140 px de alto en la app.

### 2. Piso de altura para los gráficos
- En la app (no TV): el bloque de gráficos deja de pelear por el resto y pasa a tener alto mínimo propio (~460 px), con la página scrolleando si hace falta. Así los gráficos siempre se ven completos, sin importar cuánto ocupe la rentabilidad.
- En TV (sin scroll): se mantiene el ajuste a pantalla, pero con la rentabilidad compacta los gráficos recuperan aproximadamente la mitad de la pantalla, y cada tarjeta de gráfico recibe un alto mínimo para que nunca colapse.

### 3. Detalle de las tarjetas de gráfico
- Alto mínimo por tarjeta (~150 px en app, ~180 px en TV) para que el área del gráfico nunca quede en cero.
- La columna derecha (Materiales, Horas por tipo, tercer gráfico) pasa a filas de alto mínimo en lugar de `grid-rows-3` puro, que es lo que hoy las reparte hasta dejarlas invisibles.

## Detalles técnicos

- `src/components/dashboard/ObraDashboard.tsx`
  - Reescribir el interior de la Card "Rentabilidad de la obra" (bloques, barra, chips y avance) en versión compacta, sin cambiar ningún cálculo (`cotizado`, `gastadoHistorico`, `beneficio`, `consumido`, `anticipoCobrado`, `cobradoTotal`, `saldoPendiente`, `avance`).
  - Contenedor de gráficos (línea ~599): en modo app usar `min-h-[460px]` y dejar de depender sólo de `flex-1`; en TV mantener `flex-1 min-h-0`.
  - `ChartCard` (línea ~161): agregar `min-h-[150px]` (`min-h-[180px]` con `tv`).
  - Sub-grids `grid-rows-2` / `grid-rows-3`: usar `auto-rows-fr` con alto mínimo en app.
- `src/pages/Dashboard.tsx`: la pestaña "Tablero" pasa de altura fija `lg:h-[calc(100vh-11rem)]` a altura mínima, para permitir scroll cuando el contenido no entra.
- Sin cambios de datos, hooks ni lógica de negocio.
