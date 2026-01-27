
# Plan: Arreglar Visibilidad de Dropdowns en las Grillas

## Problema Identificado
El dropdown del `GridSelectCell` se renderiza como hijo del contenedor de la celda de la grilla. Esto causa que sea cortado por el `overflow: hidden` del contenedor `dsg-container` de react-datasheet-grid.

Como se ve en la imagen, el menú de "Ceamse" aparece cortado porque el área visible de la grilla no tiene suficiente altura para mostrarlo completo.

## Solución: Usar React Portal

El dropdown debe renderizarse **fuera** del contenedor de la grilla, directamente en el `document.body`, usando `ReactDOM.createPortal`. Esto permite que el dropdown "flote" sobre cualquier contenedor sin ser afectado por overflow.

### Cambios Técnicos

```text
Archivo: src/components/shared/GridSelectCell.tsx

1. Importar createPortal:
   import { createPortal } from "react-dom";

2. Calcular posición absoluta del dropdown:
   - Usar useRef para obtener el contenedor
   - Usar getBoundingClientRect() para obtener coordenadas de la celda
   - Posicionar el dropdown en coordenadas fijas de la ventana

3. Renderizar dropdown con portal:
   - Envolver el dropdown en createPortal(..., document.body)
   - Usar position: fixed en lugar de absolute
   - Calcular left/top basado en la posición de la celda
```

### Flujo de Posicionamiento

```text
┌─────────────────────────────────────────┐
│ Grilla (overflow: hidden)               │
│  ┌───────────────────────┐              │
│  │ Celda "Desde"         │ ← getBoundingClientRect()
│  └───────────────────────┘              │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ document.body                           │
│                                         │
│  ┌───────────────────────┐              │
│  │ Dropdown (via portal) │ ← position: fixed
│  │ • Ceamse             │   con top/left calculados
│  │ • Obra A             │              
│  │ • Obra B             │              
│  └───────────────────────┘              │
└─────────────────────────────────────────┘
```

## Implementación Detallada

### 1. Nuevo estado para posición

```text
const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
```

### 2. Calcular posición cuando se abre

```text
useEffect(() => {
  if (isOpen && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 256) // Mínimo 256px (w-64)
    });
  }
}, [isOpen]);
```

### 3. Detectar si abrir hacia arriba o abajo

```text
// Si no hay espacio abajo, abrir hacia arriba
const spaceBelow = window.innerHeight - rect.bottom;
const spaceAbove = rect.top;
const dropdownHeight = 200; // altura aproximada

const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
```

### 4. Renderizar con Portal

```text
{isOpen && createPortal(
  <div 
    className="fixed z-[9999] w-64 bg-popover border border-border rounded-md shadow-lg"
    style={{ 
      top: dropdownPosition.top,
      left: dropdownPosition.left,
      minWidth: dropdownPosition.width
    }}
  >
    {/* opciones */}
  </div>,
  document.body
)}
```

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/shared/GridSelectCell.tsx` | Implementar portal y posicionamiento dinámico |

## Beneficios

- El dropdown **siempre** será visible, sin importar la altura de la grilla
- Funciona tanto en modo normal como en pantalla completa
- El dropdown se posiciona inteligentemente (arriba o abajo según espacio)
- Compatible con scroll de la página y de la grilla

## Consideraciones Adicionales

- El dropdown se cierra al hacer scroll en la grilla (comportamiento esperado)
- El z-index 9999 asegura que esté sobre cualquier otro elemento
- El ancho del dropdown se ajusta al ancho de la celda (mínimo 256px)
