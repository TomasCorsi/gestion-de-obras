
## Modo "Carga Rápida por Equipo" en Certificados de Servicio

### Qué problema resuelve

El flujo actual de certificados de tipo "Servicio" muestra todos los conceptos configurados en la obra y el usuario ingresa la cantidad para cada uno. Pero el caso del usuario es diferente: cada mes cambian las máquinas que trabajaron, los días/horas, el remito asociado y el precio por día. Es una tabla libre donde cada fila es un equipo + período parcial + remito + precio + días.

El modelo actual no permite:
1. Agregar ítems libres (sin concepto predefinido) con un **nombre de equipo personalizado**
2. Registrar el **número de remito** por ítem
3. Registrar el **período parcial** por ítem (ej: "DEL 5 AL 11/01")
4. Agregar/eliminar filas dinámicamente durante la carga del certificado

---

### Solución propuesta: Pestaña "Equipo Libre" en el dialog de creación

Se agrega una segunda opción en el formulario de certificados de tipo **Servicio**: un toggle/tab que permite elegir entre:
- **Modo estándar** (conceptos predefinidos, como ahora)
- **Modo por Equipo** (filas libres, similar a la planilla Excel)

En el **Modo por Equipo**, el formulario muestra una grilla editable con columnas:

| Equipo | Período | Remito | Precio Unit | Cant (Días/Hrs) | Un. | Subtotal | — |
|---|---|---|---|---|---|---|---|
| CAMION TATU AB629IP | DEL 5 AL 11/01 | 65227 | 700,000 | 3 | DIA | 2,100,000 | 🗑 |
| RETRO 300 | DEL 5 AL 11/01 | 69847 | 90,000 | 29 | HR | 2,610,000 | 🗑 |
| + Agregar equipo | | | | | | | |

Cada fila es un ítem libre que:
- Se vincula al concepto de categoría "Alquiler de Maquinas" (o la que el usuario elija) al guardar
- Guarda el período parcial en el campo `observaciones` del ítem o en el campo `descripcion` (ej: "CAMION TATU AB629IP — DEL 5 AL 11/01")
- Guarda el remito en la descripción del ítem de forma estructurada

#### Cambios técnicos requeridos

**1. Base de datos**: Agregar campo `remito` (texto, nullable) a la tabla `certificado_items`

```sql
ALTER TABLE certificado_items ADD COLUMN IF NOT EXISTS remito TEXT;
ALTER TABLE certificado_items ADD COLUMN IF NOT EXISTS periodo_parcial TEXT;
```

**2. Tipos (`useCertificados.ts`)**: Agregar `remito?: string | null` y `periodo_parcial?: string | null` a `CertificadoItem` y `CertificadoItemForm`

**3. `src/pages/Certificados.tsx`**:

- En el dialog de crear/editar certificado tipo Servicio, agregar un toggle de modo:
  ```
  [Modo Conceptos]  [Modo Equipos]
  ```
- Cuando se activa "Modo Equipos", mostrar una tabla editable con botón "Agregar equipo" y borrado por fila
- Cada fila tiene: campo texto libre Equipo, campo Período (texto), campo Remito (número), campo Precio, campo Cantidad, selector Unidad (DIA/HR), subtotal calculado automáticamente
- Al guardar, los ítems del modo equipo se guardan como ítems normales pero con `remito` y `periodo_parcial` poblados

**4. Vista del certificado**: Si un ítem tiene `periodo_parcial`, mostrarlo en una columna extra. Si tiene `remito`, mostrarlo también.

**5. PDF (Servicio)**: Cuando el certificado tiene ítems con remito, el PDF cambia el layout a tabla estilo planilla con columnas: Equipo | Período | Remito | Precio Unit | Cantidad | Unidad | Subtotal

---

### Archivos modificados

| Archivo | Cambio |
|---|---|
| Migración SQL | Agregar columnas `remito` y `periodo_parcial` a `certificado_items` |
| `src/hooks/useCertificados.ts` | Agregar campos `remito` y `periodo_parcial` a los tipos e inserción/actualización |
| `src/pages/Certificados.tsx` | Toggle Modo Estándar/Modo Equipos + grilla editable de filas libres en dialog de certificado Servicio |
| `src/utils/generateCertificadoPDF.ts` | Layout alternativo para certificados con ítems de equipos (con columna Remito y Período) |

---

### Flujo de uso

```text
1. Usuario selecciona obra y abre "Nuevo Certificado"
2. Selecciona Tipo: Servicio
3. Cambia a "Modo Equipos" con el toggle
4. Agrega filas una por una:
   - Escribe el nombre del equipo (ej: "CAMION TATU AB629IP")
   - Escribe el período parcial (ej: "DEL 5 AL 11/01")
   - Escribe el número de remito
   - Ingresa precio unitario y cantidad
   - Elige unidad (DIA/HR)
   - El subtotal se calcula solo
5. Repite para cada equipo
6. Guarda el certificado
7. El PDF generado muestra el formato tipo planilla con todas las columnas
```
