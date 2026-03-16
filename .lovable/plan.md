

# Sección de Mensajes WhatsApp para empleados

## Enfoque
Crear una nueva página "Mensajes" que centralice la generación de mensajes predefinidos para empleados, con un botón que abra WhatsApp Web con el mensaje prellenado. No requiere cambios en base de datos ya que usa datos existentes (personal, partes_diarios, licencias).

## Funcionalidades

### Página `/mensajes`
Tarjetas con diferentes tipos de aviso:

1. **Parte diario no cargado** — Reutiliza `useEmpleadosSinParte` para listar empleados que no completaron el parte de un día. Selector de fecha (hoy/ayer/otra).
2. **Licencia vencida** — Filtra `personal` con `vencimiento_licencia < hoy`.
3. **Licencia por vencer** — Filtra `personal` con `vencimiento_licencia` dentro de 20 días.

Cada sección muestra una tabla con los empleados afectados. Cada fila tiene:
- Nombre, legajo, teléfono
- Botón "Enviar WhatsApp" que abre `https://wa.me/{telefono}?text={mensaje_codificado}`
- Botón "Enviar a todos" que abre WhatsApp Web para cada empleado con teléfono

### Plantillas de mensaje
Mensajes predefinidos editables antes de enviar:
- Parte no cargado: "Hola {nombre}, te recordamos que no cargaste el parte diario del {fecha}. Por favor completalo a la brevedad."
- Licencia vencida: "Hola {nombre}, tu registro de conducir se encuentra vencido. Por favor renovalo a la brevedad."
- Licencia por vencer: "Hola {nombre}, tu registro de conducir vence el {fecha_vencimiento}. Te pedimos que gestiones la renovación."

## Cambios técnicos

### Archivos nuevos
- `src/pages/Mensajes.tsx` — Página principal con tabs por tipo de aviso
- Ruta `/mensajes` en `App.tsx` (protegida, admin/capataz)
- Link en sidebar/navegación

### Datos utilizados (sin cambios en DB)
- `usePersonal()` — para licencias y teléfonos
- `useEmpleadosSinParte(fecha)` — para partes faltantes (ya necesita el teléfono; se cruzará con `personal` para obtenerlo)

### Lógica WhatsApp
Función helper que formatea el teléfono argentino y genera la URL:
```text
formatWhatsAppUrl(telefono, mensaje) → https://wa.me/54XXXXXXXXXX?text=...
```

