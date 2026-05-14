## Problema

El `<thead>` de la grilla de remitos (`RemitosSimpleGrid.tsx`) tiene `sticky top-0`, pero no se queda fijo al hacer scroll porque el componente `<Table>` de shadcn envuelve la tabla en su propio `<div className="relative w-full overflow-auto">`. Eso crea un segundo contenedor de scroll **dentro** del contenedor externo (`height: calc(100vh - 360px); overflow:auto`), y el sticky se ancla al wrapper interno (que no scrollea verticalmente) en lugar del externo.

## Solución

En `src/components/remitos/RemitosSimpleGrid.tsx`, reemplazar el componente `<Table>` de shadcn por una `<table>` HTML nativa para que el `sticky top-0` del `<TableHeader>` se ancle al contenedor externo con `overflow-auto` que sí scrollea.

### Cambios

1. Quitar el import de `Table` (mantener `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`).
2. Dentro del div con `overflow-auto` y altura calculada, reemplazar:
   ```tsx
   <Table>...</Table>
   ```
   por:
   ```tsx
   <table className="w-full caption-bottom text-sm border-collapse">...</table>
   ```
3. Reforzar el `TableHeader` con clases que aseguren el sticky correctamente:
   - `sticky top-0 z-20 bg-muted` (ya existe)
   - Agregar fondo opaco a cada `<TableHead>` (`bg-muted`) para evitar que se transparente sobre las filas que pasan por debajo durante el scroll.

### Verificación

- En el viewport actual (1311×861), scrollear hacia abajo en la grilla de remitos: el encabezado debe permanecer visible en la parte superior del contenedor.
- El drag & drop, totales y resto del comportamiento siguen igual (no se toca lógica).
- No afecta otras grillas: el cambio es local a `RemitosSimpleGrid.tsx`.
