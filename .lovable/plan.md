
## Ampliar el formulario de Certificado

### Cambio

Aumentar el ancho máximo del diálogo de crear/editar y ver certificado de `lg:max-w-5xl` (64rem / ~1024px) a `lg:max-w-7xl` (80rem / ~1280px). Esto dará más espacio a las columnas de la tabla, especialmente las de avance y acumulados.

### Detalle técnico

**Archivo: `src/pages/Certificados.tsx`**

- **Línea 703** (diálogo crear/editar): Cambiar `max-w-[95vw] lg:max-w-5xl` por `max-w-[95vw] lg:max-w-7xl`
- **Línea 929** (diálogo ver): Cambiar `max-w-[95vw] lg:max-w-5xl` por `max-w-[95vw] lg:max-w-7xl`

Ambos diálogos mantienen `max-w-[95vw]` como límite en pantallas chicas para no desbordar.
