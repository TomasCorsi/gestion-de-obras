
## Plan: Adaptar entregas del repartidor a formato card para movil

### Problema
La tabla actual tiene 10 columnas y genera scroll horizontal en iPhone, haciendo la vista ilegible y dificil de usar con una mano.

### Solucion
Reemplazar la tabla por un layout de **tarjetas compactas** (cards) optimizado para pantallas pequenas. Cada entrega se muestra como una card individual con la informacion organizada en filas, sin necesidad de scroll horizontal.

### Diseno de cada card

Cada entrega se mostrara asi:

```text
+------------------------------------------+
| Combustible · 50 L          [edit] [del] |
| ADAMS, L. · Interno                      |
| Maq: CAT-320 · Obra: Ruta 40            |
| Hs: 1200 · Km: -                        |
+------------------------------------------+
```

- **Linea 1**: Tipo de producto (badge), cantidad con unidad, y botones de accion alineados a la derecha
- **Linea 2**: Operador y tipo de operador
- **Linea 3**: Maquina y obra
- **Linea 4**: Horas y km (solo si tienen valor)

Al final, un resumen con el total.

### Cambios tecnicos

#### Archivo: `src/components/parte-diario/CargasCombustibleRepartidorList.tsx`

Reemplazar completamente el contenido:
- Eliminar la tabla (Table, TableBody, TableHeader, etc.)
- Usar un `div` con `space-y-3` que renderiza cada carga como una Card compacta
- Cada card usa un layout de flexbox con texto truncado
- Agregar Badge para el tipo de producto con colores diferenciados
- Mantener la misma interfaz de props (no se rompe nada externo)
- El total se muestra en una barra inferior con fondo muted

No se requieren cambios en otros archivos ya que la interfaz de props se mantiene identica.
