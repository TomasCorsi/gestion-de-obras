## Vista rápida de "Camiones activos del mes" en Gastos de Vehículos

### Objetivo
En `Gastos por Maquinaria`, agregar arriba un panel visual con **una tarjeta por cada vehículo activo este mes** (según partes diarios), mostrando de un vistazo combustible, remitos, mantenimientos y total liquidado. Click en la tarjeta = selecciona ese vehículo y carga el detalle completo abajo.

### Cambios

**1. Nuevo componente `VehiculosActivosMesPanel.tsx`** (`src/components/maquinarias/`)
- Query a `partes_diarios` del mes en curso → obtiene `maquinaria_id` distintos con actividad (filtra solo tipos vehículo: `camion`, `auto`, `camioneta`, `cisterna`, `tanque_cisterna`, `carreton`).
- Para cada vehículo activo cruza con:
  - `cargas_combustible_repartidor` del mes → litros + costo (usa `getCostoCarga` con `precios_productos_mes`).
  - `remitos` del mes → cant. remitos, cant. viajes, monto.
  - `mantenimientos` del mes → cantidad y costo.
- Renderiza grilla responsive de tarjetas compactas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) con:
  - Header: código + patente + tipo + último operador del mes.
  - 3 micro-bloques con íconos (Fuel / Truck / Wrench) — cantidad y monto.
  - Footer destacado: **Total liquidado del mes** (suma de los 3) + chip de mes activo.
  - Indicador visual: borde rojo si tiene mantenimiento pendiente o alerta de obs.
- Estado seleccionado: tarjeta resaltada con `ring-2 ring-primary`.
- Botón "Ver todos" / collapse para esconder el panel.

**2. Integración en `GastosMaquinaria.tsx`**
- Renderizar `<VehiculosActivosMesPanel selectedId={selectedMaquinariaId} onSelect={(id) => { setSelectedMaquinariaId(id); seleccionarMes(format(new Date(),'yyyy-MM')); }} />` arriba de los filtros actuales.
- Al seleccionar tarjeta: setea `selectedMaquinariaId` y aplica el filtro de mes actual automáticamente, para que el detalle abajo refleje exactamente lo mostrado en la tarjeta.

**3. Performance**
- Una sola query a `partes_diarios` filtrada por `fecha >= primer día del mes` con `select('maquinaria_id, fecha, personal:personal_id(nombre,apellido)')`.
- Reutiliza hooks existentes `useCargasRepartidorAll`, `useRemitos`, `useMantenimientos` (ya cargados en el padre) — pasarlos por props para evitar refetch.

### Resultado UX
Al entrar a Gastos de Vehículos el usuario ve inmediatamente todos los camiones que trabajaron este mes con su liquidación rápida, y con un click profundiza en cualquiera sin tocar filtros.
