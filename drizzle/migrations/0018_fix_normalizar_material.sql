CREATE OR REPLACE FUNCTION public.normalizar_material(_t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          translate(lower(coalesce(_t,'')), 'áéíóúüñøØ', 'aeiouun  '),
          '(\d)\s*mm\M', '\1', 'g'),
        '[^a-z0-9,.]+', ' ', 'g'),
      '\m(del|de|nro|n)\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;