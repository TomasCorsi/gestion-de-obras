

# Filtrar conceptos por tipo en el desplegable + Auto-cargar obra

## Cambios

### 1. `src/pages/Certificados.tsx` — Auto-cargar conceptos de obra al crear

En `openCrearCertificado`, en vez de iniciar con draft vacío para todos los tipos, cargar automáticamente los conceptos de tipo "obra" cuando el tipo inicial es "obra", y dejar vacío solo para "servicio":

- Cuando `tipoCert` es `"servicio"`: draft vacío (como está ahora)
- Cuando `tipoCert` es `"obra"`: auto-poblar con `buildDraftForTipo("obra")`
- Cuando `tipoCert` es `"mixto"`: auto-poblar solo la sección obra, dejar servicio vacía

Actualizar también el `useEffect` que escucha cambios de `tipoCert` para aplicar la misma lógica incluso al crear (no solo al editar).

### 2. `src/pages/Certificados.tsx` — Filtrar conceptos pasados al grid de servicio

Donde se renderiza `<CertificadoServiceGrid>`, filtrar la prop `conceptos` para pasar solo los de tipo `"servicio"`:

```
conceptos={conceptos.filter(c => c.tipo === 'servicio')}
```

Esto aplica en las dos instancias del grid: tipo "servicio" puro (línea ~1012) y sección servicio del mixto (línea ~1202).

### 3. `src/components/certificados/CertificadoServiceGrid.tsx` — Sin cambios

El grid ya funciona correctamente con la lista de conceptos que recibe; solo necesitamos filtrarla desde el padre.

### Archivos a modificar
1. `src/pages/Certificados.tsx` — lógica de draft inicial + filtro de conceptos por tipo

