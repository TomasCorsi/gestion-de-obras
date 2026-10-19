ALTER VIEW public.remitos_list_view SET (security_invoker = true);
ALTER VIEW public.mantenimientos_list_view SET (security_invoker = true);
REVOKE ALL ON public.remitos_list_view FROM anon;
REVOKE ALL ON public.mantenimientos_list_view FROM anon;
REVOKE ALL ON public.personal_selector FROM anon;