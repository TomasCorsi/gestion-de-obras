

# Fix: subcategorías nuevas se borran al escribir

## Problema
El `useEffect` en línea 49-63 sincroniza subcategorías con los items. Tiene una línea (60) que **elimina subcategorías sin items**. Cuando se agrega una subcategoría nueva (vacía, sin conceptos), cualquier re-render que dispare este effect la elimina inmediatamente, incluyendo cuando el usuario intenta renombrarla.

## Solución
Modificar el `useEffect` para que **solo agregue** subcategorías nuevas que aparezcan en los items, pero **nunca elimine** subcategorías existentes. La eliminación ya se maneja explícitamente con el botón de borrar (`deleteSubCategoria`).

### Cambio en `src/components/certificados/CertificadoServiceGrid.tsx`

Línea 60: cambiar la lógica de `kept` para preservar todas las subcategorías existentes en vez de filtrar solo las que tienen items:

```typescript
// Antes (línea 60):
const kept = prev.filter((s) => etapas.has(s.nombre));

// Después:
const kept = prev;
```

Esto permite que subcategorías vacías (recién creadas) sobrevivan hasta que el usuario las elimine manualmente o les agregue conceptos.

**Archivo a modificar:** `src/components/certificados/CertificadoServiceGrid.tsx` (1 línea)

