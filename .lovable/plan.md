
## Revisión del sistema de creación de certificados — Snapshot de ítems

### El problema raíz

El sistema actual tiene un acoplamiento directo entre los **conceptos de la obra** (que cambian mes a mes) y los **ítems de cada certificado** (que deberían ser inmutables una vez creados).

**Lo que pasa hoy:**
- `openCrearCertificado` → toma los conceptos activos **actuales** y los usa como draft
- `openEditCertificado` → reconstruye el draft tomando los conceptos activos **actuales** como base, rellenando las cantidades con lo que había guardado — pero usando el nombre, unidad y precio del concepto **actual**, no del momento de creación
- `openDuplicarCertificado` → igual que el anterior
- Si agregás un concepto nuevo → aparece en todos los drafts de edición de certificados anteriores
- Si modificás precio o nombre → los certificados anteriores lo reflejan al editarlos

**Lo que debería pasar:**
- Al crear un certificado, los ítems se guardan como un **snapshot completo e inmutable**
- Al editar un certificado, se trabaja exclusivamente con los ítems ya guardados en `certificado_items`, sin recompletar desde los conceptos actuales
- Al crear uno nuevo, sí se usan los conceptos activos actuales como punto de partida
- Al duplicar, se copian exactamente los ítems del último certificado tal como estaban

---

### Solución: tres cambios quirúrgicos en `src/pages/Certificados.tsx`

No se necesita cambiar la base de datos. Los ítems ya se guardan como snapshot correctamente en `certificado_items` (tienen `descripcion`, `unidad`, `precio_unitario`, `cantidad` propios). El problema está solo en **cómo se carga el draft al editar**.

---

### Cambio 1: `openEditCertificado` — trabajar solo con ítems guardados

**Hoy:**
```
activos = conceptos actuales de la obra
draft = para cada concepto activo: busco si hay un ítem guardado, uso cantidad/precio del ítem pero nombre/unidad del concepto actual
```

**Nuevo comportamiento:**
```
items = ítems guardados del certificado (snapshot real)
draft = para cada ítem guardado: lo uso tal cual está (nombre, unidad, precio, cantidad, etapa, categoria)
```

Los ítems en `certificado_items` ya tienen `descripcion`, `unidad`, `precio_unitario`, `cantidad`, `etapa`. Lo único que falta en la tabla es `categoria`. Para eso se usa el `categoriaMap` existente como fallback, pero sin forzar que aparezcan conceptos nuevos que no estaban en el momento de creación.

**Código actual (líneas 265-291):**
```typescript
const openEditCertificado = async (cert: Certificado) => {
  const items = await fetchItems(cert.id);
  const activos = conceptos.filter((c) => c.activo);

  const draft: CertificadoItemForm[] = activos.map((c) => {
    const existing = items.find((i) => i.concepto_id === c.id);
    return {
      concepto_id: c.id,
      descripcion: c.nombre,        // ← usa el nombre ACTUAL del concepto
      unidad: c.unidad,             // ← usa la unidad ACTUAL
      cantidad: existing?.cantidad || 0,
      precio_unitario: existing?.precio_unitario || c.precio_unitario,  // ← fallback al precio actual
      ...
    };
  });
```

**Nuevo comportamiento:**
```typescript
const openEditCertificado = async (cert: Certificado) => {
  const items = await fetchItems(cert.id);
  // Build draft ONLY from saved items — no cross-contamination from current concepts
  const draft: CertificadoItemForm[] = items.map((item) => ({
    concepto_id: item.concepto_id,
    descripcion: item.descripcion,              // snapshot del nombre en el momento de creación
    unidad: item.unidad,                        // snapshot de la unidad
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,      // snapshot del precio
    subtotal: item.subtotal,
    categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
    etapa: item.etapa,
    cantidad_total: (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0,
  }));
  ...
```

---

### Cambio 2: `openDuplicarCertificado` — copiar ítems exactos del último certificado

**Hoy:** El duplicar también reconstruye desde conceptos actuales, con las cantidades del último certificado. Esto significa que si hay conceptos nuevos, aparecen en el duplicado, y si hay conceptos borrados, desaparecen incorrectamente.

**Nuevo comportamiento:** El duplicar carga los ítems exactos del último certificado (como snapshot) y los usa directamente como base. El usuario puede luego ajustar cantidades y precios para el nuevo mes.

```typescript
const openDuplicarCertificado = async () => {
  const ultimo = certificados[0];
  const items = await fetchItems(ultimo.id);
  
  // Use items exactly as saved — snapshot of what was in the last period
  const draft: CertificadoItemForm[] = items.map((item) => ({
    concepto_id: item.concepto_id,
    descripcion: item.descripcion,
    unidad: item.unidad,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
    categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
    etapa: item.etapa,
    cantidad_total: (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0,
  }));
  ...
```

---

### Cambio 3: `openCrearCertificado` — mantener como está (usa conceptos actuales como plantilla)

Al crear uno **nuevo desde cero**, es correcto tomar los conceptos activos actuales como punto de partida. Los conceptos son la "plantilla" del mes. El usuario puede ajustar precios y cantidades. Al guardar, todo queda como snapshot en `certificado_items`.

Este comportamiento ya es correcto y **no cambia**.

---

### Cambio 4: Vista del certificado — usar ítems guardados (no completar con conceptos actuales)

En `openViewCert` y en `handleDownloadPDF` para tipo **Servicio**, actualmente los ítems se muestran directamente desde `certificado_items` (correcto). Para tipo **Obra**, se hace un "merge" con todos los conceptos activos actuales para el PDF. Este merge se mantiene solo para el PDF de obra (para mostrar conceptos con 0 si no tuvieron avance ese periodo), pero la **vista en pantalla** debe mostrar solo los ítems reales guardados.

El `viewGroupedCategoria` y `viewGroupedEtapa` ya se construyen desde `viewItems` (ítems guardados), por lo que la vista en pantalla ya es correcta. El único problema era el draft de edición.

---

### Cambio 5 (bonus): Agregar ítems manualmente durante la edición

Con el nuevo modelo, si el usuario quiere agregar un concepto nuevo a un certificado existente que no estaba en el momento de creación, no puede. Para esto, se agrega un botón "**+ Agregar concepto**" dentro del dialog de edición que permite añadir una fila extra al draft con los conceptos activos actuales que no estén ya incluidos.

---

### Resumen de archivos modificados

| Archivo | Cambio |
|---|---|
| `src/pages/Certificados.tsx` | Reescribir `openEditCertificado` y `openDuplicarCertificado` para usar ítems guardados como snapshot; agregar botón para añadir conceptos extras al editar |

**Sin cambios de base de datos** — la estructura ya soporta snapshots correctamente. El problema era solo de lógica en el frontend.

---

### Comportamiento esperado post-fix

- Editar un certificado de enero → muestra exactamente los ítems tal como estaban en enero (nombre, precio, cantidad)
- Agregar un concepto nuevo en febrero → no aparece en los certificados de enero ni en el "Editar" de enero
- Cambiar el precio de un concepto en marzo → los certificados de enero y febrero mantienen sus precios originales
- Duplicar el último certificado → copia los ítems exactos del último, con sus precios y nombres del momento
- Crear un nuevo certificado → sí usa los conceptos activos actuales como plantilla (comportamiento deseado)
