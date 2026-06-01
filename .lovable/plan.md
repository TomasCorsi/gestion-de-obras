## Plan de remediación de seguridad

### Decisiones confirmadas
- **Sueldos**: solo admin.
- **Chat IA de Reportes**: solo admin.
- Selector de ausencias del capataz **se mantiene funcionando** (uso `has_role('capataz')`, elimino solo `is_personal_capataz()`).

### 1. Edge function `chat-reportes`
- Validar JWT vía `supabase.auth.getClaims(token)`; 401 si falta o es inválido.
- Verificar `has_role(uid, 'admin')`; 403 si no.
- Eliminar la conexión `postgres()` + `pg.unsafe()`.
- Crear RPC `public.execute_readonly_query(sql text)` con `SECURITY INVOKER`, que valida `SELECT/WITH`, bloquea tokens peligrosos (`pg_`, `lo_`, `copy`, `;` múltiples, etc.), fuerza `LIMIT 100` y devuelve `jsonb`. Al ser INVOKER respeta RLS del usuario.
- En `ChatReportesTab.tsx` enviar el token real de la sesión (`supabase.auth.getSession()`), no el publishable key.

### 2. Edge functions `parse-computo` y `parse-orden-compra`
- Añadir validación de JWT al inicio (cualquier usuario autenticado).

### 3. Migración SQL única

**a) `personal_selector`:**
- `REVOKE SELECT ... FROM anon`.
- Recrear con `security_invoker = true`.

**b) `personal` — alinear a `user_roles`:**
- Recrear la policy SELECT quitando `is_personal_capataz(auth.uid())`. Queda: `has_role(uid,'admin') OR has_role(uid,'capataz')`.
- Capataces siguen viendo `personal` (ausencias funciona). Usuarios con `personal.rol='capataz'` pero sin `app_role='capataz'` pierden acceso → comportamiento correcto.

**c) `sueldos` — solo admin:**
- DROP policy actual; CREATE policy `ALL` solo para `has_role(uid,'admin')`.

**d) `remitos` — quitar UUIDs hardcodeados:**
- DROP "Franco can manage own remitos" y "Sergio can manage own remitos".
- Asegurar que ambos usuarios tengan `app_role='remitero'` en `user_roles` (INSERT idempotente).
- La policy "Remiteros can manage own remitos" ya cubre el caso vía `created_by = auth.uid()`.

**e) Realtime con scope:**
- Habilitar RLS en `realtime.messages`.
- Policy de SELECT que limite la suscripción a admin/capataz/remitero.

**f) Scope `{public}` → `{authenticated}`:**
- Recrear policies de `clientes` y `proveedores` con `TO authenticated` (sin cambio funcional).

### 4. Auth
- Activar Leaked Password Protection (HIBP).

### Fuera de alcance (te aviso)
- Bucket público `mantenimiento-adjuntos` → requiere migrar a URLs firmadas. Lo hago aparte si querés.
- `is_personal_mecanico` → rediseño de roles, lo dejo.
- Token-based registration y password mínimo 8 → cambios de UX, los dejo.

### Archivos modificados
- `supabase/functions/chat-reportes/index.ts`
- `supabase/functions/parse-computo/index.ts`
- `supabase/functions/parse-orden-compra/index.ts`
- `src/components/reportes/ChatReportesTab.tsx`
- 1 migración SQL (todo lo anterior)
- Config de auth (HIBP)

### Verificación
- Llamar `chat-reportes` sin token → 401. Con token de no-admin → 403. Con admin → responde, y queries respetan RLS.
- Capataz entra al parte diario y ve el selector de ausencias completo.
- Capataz no ve módulo de Sueldos.
- Sergio y Franco siguen editando solo sus remitos (ahora vía rol `remitero`).
- Maquinistas/remiteros no pueden suscribirse a Realtime de remitos.