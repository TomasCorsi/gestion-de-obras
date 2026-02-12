

## Fix: Error al actualizar obra con cliente

### Problema
Al editar una obra y asignarle un cliente, la base de datos rechaza la operacion con el error **"invalid input syntax for type date: ''"**. Esto ocurre porque los campos de fecha (`fecha_inicio`, `fecha_fin_estimada`) se envian como texto vacio `""` en lugar de `null`, y PostgreSQL no acepta un string vacio como fecha valida.

### Solucion

**Archivo a modificar: `src/hooks/useObras.ts`**

En la funcion `updateMutation`, sanitizar los datos antes de enviarlos a la base de datos, convirtiendo strings vacios a `null` para los campos de fecha y otros campos opcionales. Se aplicara la misma logica que ya existe en `createMutation`:

```text
// Antes (envia "" directamente):
.update(obra)

// Despues (sanitiza los valores):
.update({
  ...obra,
  fecha_inicio: obra.fecha_inicio || null,
  fecha_fin_estimada: obra.fecha_fin_estimada || null,
  ubicacion: obra.ubicacion || null,
  descripcion: obra.descripcion || null,
  responsable_id: obra.responsable_id || null,
  cliente_id: obra.cliente_id || null,
})
```

### Detalle tecnico

- Solo se modifica la funcion `mutationFn` dentro de `updateMutation` en `src/hooks/useObras.ts`
- Se convierte cualquier string vacio o `undefined` a `null` antes de enviar el UPDATE
- Esto replica la misma sanitizacion que ya hace `createMutation` (lineas 67-74)

