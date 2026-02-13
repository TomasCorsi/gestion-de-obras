

## Fix: Todas las categorías visibles con scroll funcional

### Problema raíz

El componente `ScrollArea` de Radix no funciona correctamente con `flex-1 min-h-0` en este contexto. El contenedor no recibe una altura concreta, por lo que renderiza todo el contenido a su tamaño natural y luego el diálogo lo recorta visualmente sin mostrar barra de scroll.

### Solución

Reemplazar el `ScrollArea` por un `div` nativo con `overflow-y-auto` y una altura máxima fija. Esto garantiza que el navegador muestre la barra de scroll del sistema cuando el contenido excede el espacio.

### Detalle técnico

**Archivo: `src/pages/Certificados.tsx`**

Línea 751: Cambiar:
```tsx
<ScrollArea className="flex-1 min-h-0 pr-4">
```
Por:
```tsx
<div className="overflow-y-auto max-h-[50vh] pr-2">
```

Y cerrar el tag correspondiente (cambiar `</ScrollArea>` por `</div>`).

Esto aplica solo al diálogo de crear/editar certificado. El diálogo de ver certificado también se revisará para aplicar el mismo patrón si usa `ScrollArea`.
