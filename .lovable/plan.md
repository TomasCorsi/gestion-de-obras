## Cambio de contraseña por administrador

**1. Edge Function** `supabase/functions/admin-update-user-password/index.ts`
- Valida JWT del caller y que tenga rol `admin` vía `has_role`
- Zod: `userId` (uuid), `newPassword` (min 6)
- Usa `supabaseAdmin.auth.admin.updateUserById(userId, { password })`
- CORS headers

**2. Componente** `src/components/configuracion/ChangePasswordDialog.tsx`
- Input de contraseña con toggle ver/ocultar
- Botón "Generar contraseña segura" (10 chars alfanuméricos)
- Botón "Copiar contraseña" (clipboard)
- Muestra email del usuario para que el admin lo comparta
- Llama a la edge function vía `supabase.functions.invoke`

**3. Integración** `src/components/configuracion/UserManagement.tsx`
- Botón 🔑 (KeyRound) por fila junto a los existentes
- Abre `ChangePasswordDialog` con `userId` y `email`

**Seguridad:** la función solo ejecuta si el caller es admin. La contraseña no se persiste en logs.

**Archivos:** nueva edge function, nuevo `ChangePasswordDialog.tsx`, edición de `UserManagement.tsx`.