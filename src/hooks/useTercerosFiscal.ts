import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { DocTipo } from "@/lib/docFiscal";

const sb = supabase as any;

export interface TerceroEstado {
  rol: "cliente" | "proveedor";
  maestro_id: string; nombre: string; cuit_maestro: string | null;
  direccion: string | null; localidad: string | null; telefono: string | null; email: string | null; activo: boolean;
  tercero_id: string | null; razon_social: string | null; doc_tipo: DocTipo | null; doc_numero: string | null;
  condicion_iva: string | null; tipo: string | null; sugerencia_tercero_id: string | null;
}

export const useTercerosEstado = () =>
  useQuery({
    queryKey: ["contab_terceros_estado"],
    queryFn: async () => {
      const { data, error } = await sb.from("contab_terceros_estado").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as TerceroEstado[];
    },
  });

const invalidar = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["contab_terceros_estado"] });
  qc.invalidateQueries({ queryKey: ["contab_terceros"] });
};

export const useCrearFicha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { rol: "cliente" | "proveedor"; maestro_id: string; razon_social: string; doc_tipo: DocTipo; doc_numero: string; condicion_iva: string }) => {
      const { data, error } = await sb.rpc("contab_ficha_desde_maestro", {
        _cliente_id: a.rol === "cliente" ? a.maestro_id : null,
        _proveedor_id: a.rol === "proveedor" ? a.maestro_id : null,
        _razon_social: a.razon_social, _doc_tipo: a.doc_tipo, _doc_numero: a.doc_numero || null, _condicion_iva: a.condicion_iva,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { invalidar(qc); toast.success("Ficha fiscal creada"); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useVincularFicha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { tercero_id: string; rol: "cliente" | "proveedor"; maestro_id: string }) => {
      const { error } = await sb.rpc("contab_vincular_ficha", {
        _tercero_id: a.tercero_id,
        _cliente_id: a.rol === "cliente" ? a.maestro_id : null,
        _proveedor_id: a.rol === "proveedor" ? a.maestro_id : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidar(qc); toast.success("Vinculado a la ficha existente"); },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useFicha = (id: string | null) =>
  useQuery({
    queryKey: ["contab_ficha", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb.from("contab_terceros").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

export const useGuardarFicha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campos }: Record<string, any>) => {
      const { error } = await sb.from("contab_terceros").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidar(qc); qc.invalidateQueries({ queryKey: ["contab_ficha", v.id] }); toast.success("Datos fiscales guardados"); },
    onError: (e: any) => toast.error(e.message),
  });
};
