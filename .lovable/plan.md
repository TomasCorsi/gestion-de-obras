

## Fix: Legajo Not Found During Employee Registration

### Problem
The registration page queries the `personal_legajo_lookup` view to validate the legajo, but this view is configured with `security_invoker = on`. Since the user is not yet logged in (they're registering), the query runs as an anonymous user, which has no access to the underlying `personal` table due to RLS policies. This causes every legajo lookup to return empty, showing "Legajo no encontrado".

### Solution
Recreate the `personal_legajo_lookup` view with `security_invoker = off` so it acts as a SECURITY DEFINER view, bypassing RLS for this limited, non-sensitive data (only exposes `id`, `legajo`, `rol`, and whether it's already linked). Then grant SELECT access to the `anon` role so unauthenticated users can use it during registration.

### Technical Details

**Database migration (single SQL statement):**

```text
DROP VIEW IF EXISTS public.personal_legajo_lookup;

CREATE VIEW public.personal_legajo_lookup
WITH (security_invoker = off) AS
SELECT 
  id,
  legajo,
  rol,
  (user_id IS NOT NULL) AS ya_vinculado
FROM public.personal;

GRANT SELECT ON public.personal_legajo_lookup TO anon;
GRANT SELECT ON public.personal_legajo_lookup TO authenticated;
```

- **No code changes needed** -- the frontend already queries this view correctly.
- **Security**: The view only exposes non-sensitive fields (id, legajo, rol, linked status). No PII like DNI, salary, or bank info is exposed.

