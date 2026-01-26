
# Plan: Sección de Gastos por Maquinaria

## Objetivo
Agregar una nueva sección en la página de Maquinarias que muestre un desglose de gastos asociados a cada máquina, incluyendo combustible, viajes realizados y mantenimientos.

## Analisis de Datos

Las relaciones existentes en la base de datos son:
- **Combustible** (`cargas_combustible`): tiene `maquinaria_id` que vincula directamente a la máquina
- **Viajes** (`viajes`): tiene `camion_id` que referencia a maquinarias (camiones)
- **Mantenimientos** (`mantenimientos`): tiene `maquinaria_id` con costos de repuestos y mano de obra
- **Remitos**: no tiene relación directa con maquinarias (solo con viajes y obras)

## Diseño de la Solucion

### 1. Crear un nuevo componente `GastosMaquinaria.tsx`

Este componente mostrara:
- Selector de maquinaria (dropdown o combobox)
- Filtro por rango de fechas
- Tarjetas de resumen con totales por categoria
- Tabla detallada con todos los gastos

### 2. Estructura de la nueva seccion

```text
+--------------------------------------------------+
|  GASTOS POR MAQUINARIA                           |
+--------------------------------------------------+
|  [Seleccionar Maquinaria v]  [Fecha desde] [hasta]|
+--------------------------------------------------+
|  +------------+  +------------+  +------------+   |
|  | COMBUSTIBLE|  | VIAJES     |  | MANTENIM.  |   |
|  | $123,456   |  | 45 viajes  |  | $56,789    |   |
|  | 1,200 L    |  | 2,300 km   |  | 12 serv.   |   |
|  +------------+  +------------+  +------------+   |
+--------------------------------------------------+
|  Tabla detallada de gastos                        |
|  Fecha | Tipo | Descripcion | Costo | Obra       |
+--------------------------------------------------+
```

### 3. Integracion en la pagina Maquinarias

Agregar tabs a la pagina de Maquinarias:
- **Inventario** (tab actual con las tarjetas de maquinarias)
- **Gastos** (nueva tab con el componente de gastos)

## Cambios Tecnicos

### Archivo nuevo: `src/components/maquinarias/GastosMaquinaria.tsx`

Componente que:
- Utiliza los hooks existentes: `useMaquinarias`, `useCombustible`, `useViajes`, `useMantenimientos`
- Filtra datos por la maquinaria seleccionada
- Calcula totales de gastos
- Muestra tabla combinada ordenada por fecha

### Archivo modificado: `src/pages/Maquinarias.tsx`

Cambios:
- Importar componentes de Tabs de la UI
- Importar el nuevo componente `GastosMaquinaria`
- Envolver el contenido actual en un TabsContent "inventario"
- Agregar nuevo TabsContent "gastos" con el componente

## Datos a Mostrar

### Tarjeta Combustible
- Total litros cargados
- Costo total de combustible
- Promedio de consumo (si hay datos de horas)

### Tarjeta Viajes
- Cantidad de viajes realizados
- Kilometros totales recorridos
- Volumen total transportado

### Tarjeta Mantenimientos
- Cantidad de servicios realizados
- Costo total (repuestos + mano de obra)
- Ultimo mantenimiento

### Tabla Detallada
Columnas:
- Fecha
- Tipo (Combustible / Viaje / Mantenimiento)
- Descripcion
- Costo
- Obra asociada

## Flujo de Usuario

1. El usuario navega a Maquinarias
2. Ve las tabs "Inventario" y "Gastos"
3. Hace click en "Gastos"
4. Selecciona una maquinaria del dropdown
5. Opcionalmente filtra por fechas
6. Ve el resumen de gastos y la tabla detallada
7. Puede exportar o analizar los costos operativos de esa maquina

## Dependencias

Se reutilizan componentes y hooks existentes:
- `useMaquinarias` - lista de maquinarias
- `useCombustible` - cargas de combustible
- `useViajes` - viajes realizados
- `useMantenimientos` - registros de mantenimiento
- Componentes UI: Tabs, Card, Table, Select, Badge
