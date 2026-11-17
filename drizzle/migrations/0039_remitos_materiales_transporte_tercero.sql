ALTER TABLE public.remitos_materiales ADD COLUMN transporte_tercero text;
ALTER TABLE public.remitos_materiales DROP CONSTRAINT remitos_materiales_transporte_check;
ALTER TABLE public.remitos_materiales ADD CONSTRAINT remitos_materiales_transporte_check CHECK (transporte IN ('proveedor', 'propio', 'tercero'));