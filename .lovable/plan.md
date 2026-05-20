# Remitero: ver los últimos remitos cargados

## Problema
Cuando el remitero (u otro usuario) carga un nuevo remito, este se guarda con `orden = null`. La consulta actual en `useRemitos` ordena así:

```
.order("orden", { ascending: false, nullsFirst: false })
.order("fecha", { ascending: false })
.order("created_at", { ascending: false })
```

Como `nullsFirst: false` en orden descendente manda los `null` al **final**, todos los remitos nuevos (sin `orden` asignado) quedan al fondo de la grilla, después de los miles de remitos antiguos que sí tienen `orden`. El remitero no los ve.

## Solución
Cambiar el criterio de orden para que los remitos sin `orden` manual aparezcan **arriba**, ordenados por fecha y creación más recientes primero. Los que sí tienen `orden` (reordenados manualmente) se mantienen en su posición relativa.

Nuevo orden:
```
.order("orden", { ascending: false, nullsFirst: true })
.order("fecha", { ascending: false })
.order("created_at", { ascending: false })
```

Con `nullsFirst: true`, los remitos nuevos (orden = null) se muestran primero, ordenados por fecha desc y created_at desc — es decir, el último cargado aparece arriba del todo.

## Archivos a tocar
- `src/hooks/useRemitos.ts` — cambiar `nullsFirst: false` por `nullsFirst: true` en el `.order("orden", ...)` dentro de `fetchRemitosFromDB`.

## Fuera de alcance
- No se cambia el esquema de la base.
- No se toca el drag & drop de reordenamiento (sigue funcionando para los remitos que el usuario reordene manualmente).
- No se modifican permisos ni RLS.

## Verificación
- Como remitero, cargar un nuevo remito → debe aparecer en la primera fila de la grilla.
- Los remitos previamente reordenados manualmente (con `orden` asignado) siguen apareciendo en el orden definido, debajo de los recién creados.
