

## Mejoras de Interfaz y Usabilidad para Certificados

### Problemas actuales (segun la captura)
- La pagina se ve vacia y sin contexto visual -- no hay KPIs ni resumen
- La tabla es funcional pero basica, sin indicadores rapidos
- No hay forma de editar un certificado existente (solo ver/eliminar)
- Falta un campo de observaciones al crear el certificado
- No se puede duplicar un certificado del mes anterior como base
- Los iconos de acciones no tienen tooltips, no queda claro que hacen

### Mejoras propuestas

**1. KPIs en la parte superior (patron del resto de la app)**
Agregar tarjetas de resumen arriba de la tabla con:
- Total certificados de la obra
- Monto total certificado (todos los estados)
- Monto pendiente de cobro (emitidos)
- Monto cobrado

**2. Cards visuales en lugar de tabla plana**
Convertir cada certificado en una Card mas visual con:
- Numero y periodo destacados
- Badge de estado con colores claros
- Montos principales visibles (subtotal, IVA, total)
- Barra de acciones con tooltips descriptivos (Ver, Emitir, Cobrar, PDF, Eliminar)
- Boton de descarga PDF directo desde la lista (sin entrar a ver detalle)

**3. Observaciones al crear certificado**
Agregar un campo de texto "Observaciones" en el dialog de creacion para incluir notas relevantes.

**4. Duplicar certificado del mes anterior**
Agregar boton "Duplicar ultimo" que pre-cargue las cantidades y precios del ultimo certificado como base para el nuevo mes. Esto ahorra mucho tiempo cuando los trabajos son similares mes a mes.

**5. Editar certificado en borrador**
Permitir editar las cantidades y precios de un certificado que aun esta en estado "borrador". Actualmente solo se puede ver o eliminar.

**6. Tooltips en acciones**
Envolver los botones de accion con Tooltip para que el usuario sepa que hace cada icono.

**7. Mejora visual del tab de Conceptos**
Agrupar los conceptos por categoria con sub-encabezados visuales (similar a como se hace en el dialog de crear certificado) en lugar de una tabla plana con badge de categoria.

---

### Detalle tecnico

**Archivos a modificar:**
- `src/pages/Certificados.tsx` -- todos los cambios de UI van aca

**Cambios especificos:**

1. **KPIs**: Usar el componente `KPICard` existente en un grid de 4 columnas arriba de los tabs
2. **Cards de certificados**: Reemplazar la tabla de certificados por un grid de Cards con layout consistente
3. **Campo observaciones**: Agregar `<Textarea>` al dialog de crear certificado, pasar observaciones al hook
4. **Duplicar**: Agregar funcion `openDuplicarCertificado()` que carga items del ultimo certificado
5. **Editar borrador**: Nuevo dialog similar al de crear pero que actualiza items existentes (requiere nueva mutation `updateCertificado` en el hook)
6. **Tooltips**: Importar y usar `<Tooltip>` de shadcn en los botones de accion

**Hook `useCertificados.ts`:**
- Agregar mutation `updateCertificado` para editar items de un certificado borrador (elimina items existentes y re-inserta los nuevos)
- Agregar `observaciones` al payload de `createCertificado`

**Base de datos:**
- No se necesitan cambios en la base de datos (la columna `observaciones` ya existe en la tabla `certificados`)

