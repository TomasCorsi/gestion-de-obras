

## Plan: Auto-guardado del formulario de Parte Diario

### Problema
Cuando se publica una actualizacion de la app, la PWA se recarga automaticamente y los empleados pierden todo lo que tenian cargado en el formulario del parte diario.

### Solucion
Implementar auto-guardado en localStorage del formulario, para que si la app se recarga (por actualizacion o cualquier motivo), al volver al formulario se restauren los datos automaticamente. Ademas, postergar la actualizacion de la PWA mientras el formulario esta abierto.

### Cambios

#### 1. Nuevo hook `useFormDraftPersistence`
Un hook liviano que:
- Guarda el estado del formulario en localStorage cada vez que cambia (con debounce de 500ms para no saturar)
- Al montar el componente, detecta si hay un borrador guardado y lo restaura automaticamente
- Limpia el borrador al completar o guardar exitosamente
- La clave de storage incluye el empleadoId para evitar conflictos entre usuarios

#### 2. Integrar en `ParteDiarioFormView`
- Conectar el hook al estado `formData`
- Restaurar automaticamente al abrir el formulario (sin prompt, directo)
- Mostrar un aviso sutil cuando se restauran datos ("Se recuperaron datos de un formulario anterior")
- Limpiar al guardar borrador o completar con exito

#### 3. Postergar actualizacion PWA durante carga de formulario
- Modificar `UpdatePrompt` para que NO muestre el banner de actualizacion cuando el usuario esta en la ruta `/parte-diario` con el formulario abierto
- Alternativa mas simple: cambiar de `autoUpdate` a mostrar el prompt pero sin forzar la recarga, y agregar logica para que si hay datos en el draft del formulario, la actualizacion espere

### Detalle tecnico

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useFormDraftPersistence.ts` (nuevo) | Hook para auto-guardar/restaurar formulario desde localStorage |
| `src/components/parte-diario/ParteDiarioFormView.tsx` | Integrar auto-guardado con el hook |
| `src/components/pwa/UpdatePrompt.tsx` | No forzar recarga si hay draft de formulario pendiente |

### Flujo

1. Empleado abre formulario y empieza a cargar datos
2. Cada cambio se guarda automaticamente en localStorage (con debounce)
3. Si la app se recarga (por actualizacion, cierre accidental, etc):
   - Al volver al formulario, se restauran los datos automaticamente
   - Se muestra un toast: "Se recuperaron datos del formulario anterior"
4. Si el empleado guarda como borrador o completa exitosamente, se limpia el draft local
5. Si hay una actualizacion de PWA pendiente y el formulario tiene datos, la actualizacion se posterga hasta que el usuario salga del formulario

