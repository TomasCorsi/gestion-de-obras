

## Fix: Grilla se traba al abrir Nuevo Certificado

### Causa raiz
El callback `handleChange` en `CertificadoServiceGrid` tiene `items` como dependencia. Cuando se edita una celda, se actualiza `itemsDraft` en el padre, lo que cambia la prop `items`, lo que recrea `handleChange`, lo que `react-datasheet-grid` interpreta como un nuevo cambio, generando un loop infinito que traba la interfaz.

### Solucion

**Archivo:** `src/components/certificados/CertificadoServiceGrid.tsx`

1. **Usar `useRef` para `items` en `handleChange`**: Guardar `items` en un ref y usarlo dentro del callback para que `handleChange` no se recree cada vez que `items` cambia. Esto rompe el ciclo infinito.

2. **Eliminar `items` del array de dependencias de `handleChange`**: El callback sera estable y no provocara re-renders innecesarios en la grilla.

### Detalle tecnico

```text
Antes (loop infinito):
  items cambia -> handleChange se recrea -> grid re-dispara onChange -> items cambia -> ...

Despues (estable):
  items cambia -> handleChange NO se recrea (usa ref) -> grid estable
```

Cambios concretos:
- Agregar `const itemsRef = useRef(items)` y sincronizarlo con `useEffect`
- En `handleChange`, referenciar `itemsRef.current` en vez de `items`
- Quitar `items` del array de dependencias de `useCallback`

