
# Plan: Corrección de Restricción de Acceso para Empleados de Campo

## Problema Identificado

Al analizar la base de datos encontré que:

1. **El empleado se registró correctamente** - El usuario `tomi172607@gmail.com` existe en `auth.users` con rol `maquinista` en `user_roles`

2. **PERO la vinculación falló silenciosamente** - En la tabla `personal`, el registro del legajo 188 (TOMAS CORSI) tiene `user_id = null`

3. **Causa raíz**: Las políticas de seguridad (RLS) de la tabla `personal` solo permiten que administradores o capataces puedan actualizar registros. Cuando un empleado se registra, el UPDATE que intenta vincular su `user_id` falla porque el usuario recién creado no tiene permisos.

```text
FLUJO ACTUAL (FALLANDO):
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario ingresa legajo 188                               │
│    ✅ SELECT personal WHERE legajo='188' → Encontrado       │
├─────────────────────────────────────────────────────────────┤
│ 2. Crear cuenta en auth.users                               │
│    ✅ signUp(email, password) → Usuario creado              │
├─────────────────────────────────────────────────────────────┤
│ 3. Vincular user_id en personal                             │
│    ❌ UPDATE personal SET user_id=X → FALLA (RLS bloquea)   │
│       El usuario nuevo no es admin/capataz                  │
├─────────────────────────────────────────────────────────────┤
│ 4. Resultado:                                               │
│    - personal.user_id = NULL                                │
│    - useEmpleadoProfile() → empleado = null                 │
│    - isFieldEmployee = false (debería ser true)             │
│    - Empleado VE TODO el sistema                            │
└─────────────────────────────────────────────────────────────┘
```

## Solución

Crear una política RLS adicional que permita a un usuario recién registrado vincular SU PROPIO `user_id` cuando el registro está sin vincular (`user_id IS NULL`).

## Cambios a Implementar

### 1. Nueva Política RLS para Vinculación durante Registro

Agregar una política que permita a usuarios autenticados actualizar la columna `user_id` solo cuando:
- El registro actual no tiene `user_id` (está sin vincular)
- El nuevo `user_id` es el del usuario que está haciendo la operación

```sql
CREATE POLICY "Users can link their own personal record"
  ON public.personal FOR UPDATE
  USING (user_id IS NULL)  -- Solo registros sin vincular
  WITH CHECK (user_id = auth.uid());  -- Solo pueden poner SU user_id
```

### 2. Corrección Manual del Usuario Existente

Para el usuario `tomi172607@gmail.com` que ya se registró, necesitamos vincular manualmente su `user_id` al registro de personal con legajo 188.

## Resultado Esperado

Después de aplicar estos cambios:

1. Los empleados que se registren podrán vincular correctamente su cuenta
2. El hook `useEmpleadoProfile` detectará `isFieldEmployee = true`
3. Se ocultará el AppLauncher y se redirigirá a `/parte-diario`
4. El usuario existente `tomi172607@gmail.com` funcionará correctamente

## Sección Técnica

### Política RLS a agregar
```sql
-- Permitir que usuarios vinculen su propio registro durante el registro
CREATE POLICY "Users can link their own personal record"
  ON public.personal FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());
```

### Corrección del usuario existente
```sql
-- Vincular el usuario tomi172607@gmail.com con su registro de personal
UPDATE public.personal 
SET user_id = '307b3a29-d0b2-42f4-99ef-cd416da3091a'
WHERE legajo = '188';
```

### Flujo corregido
```text
FLUJO CORREGIDO:
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario ingresa legajo 188                               │
│    ✅ SELECT personal WHERE legajo='188' → Encontrado       │
├─────────────────────────────────────────────────────────────┤
│ 2. Crear cuenta en auth.users                               │
│    ✅ signUp(email, password) → Usuario creado              │
├─────────────────────────────────────────────────────────────┤
│ 3. Vincular user_id en personal                             │
│    ✅ UPDATE personal SET user_id=X → EXITOSO               │
│       Nueva política permite vincular registro sin owner    │
├─────────────────────────────────────────────────────────────┤
│ 4. Login del empleado                                       │
│    ✅ useEmpleadoProfile() → empleado encontrado            │
│    ✅ isFieldEmployee = true                                │
│    ✅ Redirige a /parte-diario                              │
│    ✅ AppLauncher oculto                                    │
└─────────────────────────────────────────────────────────────┘
```
