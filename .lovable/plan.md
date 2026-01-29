# Plan: Corrección de Vulnerabilidades de Seguridad - COMPLETADO ✅

## Estado: IMPLEMENTADO

Las vulnerabilidades de seguridad en la tabla `personal` han sido corregidas.

---

## Cambios Implementados

### 1. Base de Datos
- ✅ Vista segura `personal_legajo_lookup` creada (solo expone: id, legajo, rol, ya_vinculado)
- ✅ Política pública `Allow public legajo lookup for registration` eliminada
- ✅ Política vulnerable `Users can link their own personal record` eliminada
- ✅ Nueva política `Employees can view own record` (solo propietario)
- ✅ Nueva política `Employees can update own contact info` (solo propietario)
- ✅ Función RPC `link_personal_to_user` creada (SECURITY DEFINER)

### 2. Código
- ✅ `src/pages/RegistroEmpleado.tsx` - Usa vista segura + función RPC
- ✅ `src/hooks/useEmpleadoProfile.ts` - Usa función RPC para auto-link

---

## Resumen de Seguridad

```text
ANTES (VULNERABLE):
- 68 registros con DNI, emails, bancos, sueldos expuestos públicamente
- Cualquier usuario podía reclamar registros sin user_id

DESPUÉS (SEGURO):
- Vista pública solo expone: id, legajo, rol, ya_vinculado
- Datos sensibles solo accesibles por admins/capataces/propietario
- Vinculación validada por función SECURITY DEFINER
```
