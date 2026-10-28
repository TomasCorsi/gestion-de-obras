# Reubicar Órdenes de Compra y Gastos Generales en Compras

Solo navegación y ubicación visual. Sin migraciones, sin cambios de lógica contable, módulos operativos ni rentabilidad. Se reutilizan las mismas pantallas existentes, sin duplicarlas.

## Resultado esperado

```text
Inicio Contable
├─ Compras
│   ├─ Comprobantes de compra
│   ├─ Órdenes de Compra
│   └─ Gastos Generales
└─ Proveedores
    ├─ Proveedores            (maestro y datos del proveedor)
    ├─ Cuenta Corriente       (Próximamente)
    ├─ Totales de Proveedores (Próximamente)
    ├─ Comprobantes
    └─ Fichas fiscales
```

Breadcrumbs: "Compras › Órdenes de Compra", "Proveedores › Comprobantes", etc. (sin repetir "Inicio Contable", que sigue como botón).

## Cambios

1. **Módulo Proveedores general (/proveedores)**: queda solo con el maestro de proveedores. Se quitan las pestañas Órdenes de Compra y Gastos Generales. Los enlaces viejos (`?tab=ordenes` / `?tab=gastos`) redirigen a Contabilidad › Compras › la pantalla correspondiente, para no romper accesos guardados.
2. **Compras en Contabilidad**: pasa de acceso directo a módulo con tres subaccesos. Órdenes de Compra y Gastos Generales muestran exactamente los mismos componentes actuales.
3. **Proveedores en Contabilidad**: se agrega el subacceso "Proveedores" que muestra el mismo maestro. Se mantiene "Órdenes de Pago" ya existente (no se pidió sacarlo).
4. **Desde un proveedor**: en cada fila del maestro, acciones "Ver comprobantes" y "Ver órdenes de compra" que abren las pantallas de Compras filtradas por ese proveedor (filtro por URL, reutilizando el filtro de proveedor que ya tienen las pantallas; si alguna no lo tiene, se agrega solo el filtro visual).
5. **Buscador y launcher**: los nuevos subaccesos aparecen en la búsqueda ("orden de compra", "gastos", "proveedor").
6. **Pruebas**: actualizar las pruebas de navegación (árbol, breadcrumb, búsqueda, redirección de pestañas viejas). Verificar tipos, compilación y una revisión visual.

## A tener en cuenta

- Hoy /proveedores es solo para admin, y Contabilidad es para admin y contador. Al mover Órdenes de Compra y Gastos Generales, un contador podría ver esas pantallas; si los permisos de datos actuales no se lo permiten, las verá vacías. No se cambian permisos: se documentará como pendiente para decidir.
- El maestro de proveedores dentro de Contabilidad se mostrará solo a admin (mismo criterio actual), salvo indicación contraria.

## Detalle técnico

- `src/lib/contabNav.ts`: nuevas pantallas `ordenes`, `gastos`, `proveedores-maestro`; Compras con 3 hijos; Proveedores con hijo `maestro`.
- `src/pages/Contabilidad.tsx`: renderizar `OrdenesCompraTab`, `GastosGeneralesTab` y el maestro (extraído de `Proveedores.tsx` a un componente compartido, misma lógica) según destino; pasar filtro `proveedor` por query param.
- `src/pages/Proveedores.tsx`: solo maestro + redirección de tabs viejas.
- `src/lib/contabNav.test.ts`: casos nuevos.
