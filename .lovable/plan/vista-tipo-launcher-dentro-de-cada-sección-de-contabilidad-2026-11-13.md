# Vista tipo launcher dentro de cada sección de Contabilidad

## Qué cambia
Al entrar a un módulo (ej. Compras), en lugar de la lista de botones anchos se verá el mismo estilo que el Inicio Contable:
- Título centrado con el icono grande del módulo en su color, nombre y descripción debajo.
- Botón "Inicio Contable" y breadcrumb se mantienen arriba.
- Cada subacceso (Registro de Compras, Órdenes de Compra, Gastos Generales, etc.) como tarjeta centrada con icono propio en un recuadro del color del módulo, nombre en negrita y descripción breve.
- Grilla centrada: 5 por fila en pantallas anchas, 4/2 en pantallas menores.
- Mismo efecto al pasar el mouse (se eleva y el borde toma el color del módulo).
- "Próximamente" se ve atenuado con etiqueta, igual que ahora, sin parecer error.

## Qué no cambia
Nombres de módulos y subaccesos, destinos, permisos, búsqueda, recientes, base de datos y lógica contable.

## Detalle técnico
- `contabNav.ts`: agregar campo opcional `icono` a cada `NavHoja` (iconos lucide elegidos por función: FileText, ClipboardList, Wallet, BookOpen, Landmark, etc.); fallback al icono del módulo.
- `ContabLauncher.tsx`: reutilizar `ModuloTile` (acepta color del módulo) para las hojas.
- `Contabilidad.tsx` (vista del módulo, ~líneas 130-137): cabecera centrada y grilla con `ModuloTile`.
- Ajustar pruebas de navegación si dependen del componente; verificar con Playwright en claro/oscuro.
