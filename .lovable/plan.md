

# Fix: Fecha aparece vacía en grilla de Remitos

## Problema
La grilla usa `isoDateColumn` de `react-datasheet-grid`, que internamente usa un `<input type="date">` nativo del navegador. Esto causa problemas de timezone: al seleccionar una fecha, se convierte a UTC con `toISOString()`, lo que puede desplazar el día y hacer que el valor se pierda o muestre vacío.

## Solución
Reemplazar `isoDateColumn` por el componente custom `dateColumn` que ya existe en `src/components/shared/dateColumn.tsx`. Este componente:
- Usa un input de texto con formato `dd/mm/aaaa` (más natural para Argentina)
- Parsea y formatea fechas en timezone local sin conversión UTC
- Ya maneja correctamente copiar/pegar y navegación por teclado

## Cambio en `src/components/remitos/RemitosDataGrid.tsx`

1. **Import**: Quitar `isoDateColumn` del import de `react-datasheet-grid`. Agregar import de `dateColumn` desde `@/components/shared/dateColumn`.

2. **Columna fecha** (linea ~312): Cambiar `isoDateColumn` por `dateColumn`:
```typescript
{ ...keyColumn("fecha", dateColumn), title: ..., minWidth: 120 }
```

Esto es un cambio de 2 líneas que resuelve el problema de raíz.

