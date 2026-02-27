
# Separar observacion del maquinista del campo de descripcion del trabajo

## Problema
Cuando se crea un mantenimiento desde una alerta de campo, la observacion del maquinista/chofer se carga en el campo "Descripcion del trabajo". Ese campo es para que el mecanico describa el trabajo que hizo, no para la observacion original.

## Cambios

### Archivo: `src/components/parte-diario/MecanicoMantenimientoForm.tsx`

1. **Mover la observacion pre-cargada**: Cambiar la linea 49 para que `descripcion` inicie vacia y `observaciones` reciba el texto de la alerta de campo:
   - `descripcion` inicia en `""` (vacio, para que el mecanico escriba el trabajo)
   - `observaciones` inicia con `obsPreload?.observacion || ""` (la observacion original del maquinista)

2. **Mostrar la observacion original como referencia**: Agregar un bloque informativo (read-only) arriba del formulario cuando viene de una alerta, mostrando la observacion del maquinista para que el mecanico la tenga presente mientras completa la descripcion del trabajo.

### Detalle tecnico

Cambios en el estado inicial:
```text
// Antes (linea 49)
descripcion = obsPreload?.observacion || ""
observaciones = ""

// Despues
descripcion = ""
observaciones = obsPreload ? ("Reporte de campo: " + obsPreload.observacion) : ""
```

Agregar un banner informativo despues del header cuando `obsPreload` existe:
```text
Alerta de campo:
"[texto de la observacion del maquinista]"
- Reportado por: [nombre apellido]
- Fecha: [fecha reporte]
```

Esto le da contexto al mecanico sin contaminar el campo de descripcion del trabajo.
