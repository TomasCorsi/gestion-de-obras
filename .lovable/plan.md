
El usuario no puede cambiar el email manualmente desde el backend (probablemente porque el panel de Users de Lovable Cloud no expone edición directa de email para usuarios existentes). Necesitamos la Opción B: una funcionalidad in-app para que un admin cambie el email de otro usuario.

## Plan: Funcionalidad "Cambiar email" para administradores

### 1. Edge function `admin-update-user-email`
Archivo: `supabase/functions/admin-update-user-email/index.ts`
- `verify_jwt = true` (default)
- Recibe `{ userId, newEmail }`
- Valida con Zod
- Verifica que el caller tenga rol `admin` usando `has_role(auth.uid(), 'admin')`
- Usa `SERVICE_ROLE_KEY` para llamar `supabase.auth.admin.updateUserById(userId, { email: newEmail, email_confirm: true })`
- También actualiza la tabla `personal.email` si existe registro vinculado a ese `user_id`
- Devuelve `{ success: true }` o error con status apropiado

### 2. UI: diálogo de cambio de email
Nuevo componente: `src/components/configuracion/ChangeEmailDialog.tsx`
- Props: `userId`, `currentEmail`, `open`, `onOpenChange`, `onSuccess`
- Input para nuevo email + confirmación
- Validación básica de formato
- Llama a la edge function con `supabase.functions.invoke('admin-update-user-email', ...)`
- Toast de éxito/error

### 3. Integración en `UserManagement.tsx`
- Agregar botón "Cambiar email" (icono Mail) en cada fila de usuario
- Estado local para abrir el diálogo con el usuario seleccionado
- Refrescar lista al confirmar

### Resultado para el caso actual
Una vez desplegado, vas a Configuración → Gestión de Usuarios → fila de `martu4234@gmail.com` → botón "Cambiar email" → ingresás `sanmartieduardo791@gmail.com` → confirmás. El usuario ingresa con el nuevo email y la misma contraseña (o usa "Olvidé mi contraseña" si la perdió).
