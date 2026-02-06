

## Plan: Agregar columnas faltantes a la exportacion Excel de Partes Diarios

### Problema

La funcion `handleExportExcel` en `ParteDiarioAdminView.tsx` solo incluye un subconjunto de campos. Faltan columnas importantes como:

- Observacion de la maquina (`observacion_maquina`)
- Estado de la maquina (`estado_maquina`)
- Observaciones/Inconvenientes (`observaciones_inconvenientes`)
- Movimiento interno (`cantidad_movimiento_interno`)
- Ausencias (`ausencias`)
- Checklist (filtro aire, aceite motor, aceite hidraulico, liquido refrigerante, uria)

### Solucion

Agregar las columnas faltantes al objeto de exportacion en `handleExportExcel`.

### Cambios en `src/components/parte-diario/ParteDiarioAdminView.tsx`

Ampliar el mapeo en `handleExportExcel` para incluir:

```
const exportData = filteredPartes.map((p) => ({
  // ... columnas existentes ...
  "Mov. Interno": p.cantidad_movimiento_interno || "-",
  "Estado Máquina": p.estado_maquina || "-",
  "Obs. Máquina": p.observacion_maquina || "-",
  // Checklist
  "Filtro Aire": p.check_filtro_aire ? "Si" : "No",
  "Aceite Motor": p.check_aceite_motor ? "Si" : "No",
  "Aceite Hidráulico": p.check_aceite_hidraulico ? "Si" : "No",
  "Líq. Refrigerante": p.check_liquido_refrigerante ? "Si" : "No",
  "Uría": p.check_uria ? "Si" : "No",
  // Campos por rol (ya estan Novedades y Tareas)
  "Ausencias": p.ausencias?.length
    ? p.ausencias.map(id => {
        const emp = personal.find(e => e.id === id);
        return emp ? `${emp.apellido}, ${emp.nombre}` : id;
      }).join("; ")
    : "-",
  "Obs./Inconvenientes": p.observaciones_inconvenientes || "-",
}));
```

Las ausencias se resuelven a nombres usando la lista de `personal` que ya esta disponible en el componente.

### Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/parte-diario/ParteDiarioAdminView.tsx` | Agregar columnas faltantes al mapeo de exportacion Excel |

