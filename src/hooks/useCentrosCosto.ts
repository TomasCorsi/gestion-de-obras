import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type TipoCentro = "obras" | "maquinarias" | "taller" | "administracion" | "deposito" | "generales" | "otro";

export interface CentroCosto {
  id: string; codigo: string; nombre: string; tipo: TipoCentro; activo: boolean;
  vigente_desde: string; vigente_hasta: string | null; orden: number;
}
export interface SubcentroCosto {
  id: string; centro_id: string; codigo: string; nombre: string;
  obra_id: string | null; maquinaria_id: string | null; activo: boolean;
  vigente_desde: string; vigente_hasta: string | null;
}
export interface Sugerido { origen: "obra" | "maquina"; ref_id: string; nombre: string; estado: string | null; }
export interface Imputacion {
  id: string; linea_id: string; subcentro_id: string; obra_id: string | null;
  obra_atribucion: "economica" | "informativa" | null; maquinaria_id: string | null;
  naturaleza: "ingreso" | "gasto"; importe: number; signo: number; tipo_movimiento: string;
  subcentro_codigo_snap: string; subcentro_nombre_snap: string | null; centro_codigo_snap: string | null; nota: string | null;
}

const err = (e: any) => toast.error(e?.message ?? "Error");

export const useCentros = () => useQuery({
  queryKey: ["contab_centros"],
  queryFn: async () => {
    const { data, error } = await sb.from("contab_centros_costo").select("*").order("orden").order("codigo");
    if (error) throw error; return (data ?? []) as CentroCosto[];
  },
});

export const useSubcentros = () => useQuery({
  queryKey: ["contab_subcentros"],
  queryFn: async () => {
    const { data, error } = await sb.from("contab_subcentros_costo").select("*").order("codigo");
    if (error) throw error; return (data ?? []) as SubcentroCosto[];
  },
});

export const useSugeridos = (enabled = true) => useQuery({
  queryKey: ["contab_subcentros_sugeridos"], enabled,
  queryFn: async () => {
    const { data, error } = await sb.rpc("contab_subcentros_sugeridos");
    if (error) throw error; return (data ?? []) as Sugerido[];
  },
});

const inval = (qc: ReturnType<typeof useQueryClient>) => {
  ["contab_centros", "contab_subcentros", "contab_subcentros_sugeridos", "contab_imputaciones"].forEach((k) =>
    qc.invalidateQueries({ queryKey: [k] }));
};

export const useSaveCentro = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Partial<CentroCosto>) => {
      const { id, ...rest } = c;
      const payload = { ...rest, vigente_hasta: rest.vigente_hasta || null };
      const q = id ? sb.from("contab_centros_costo").update(payload).eq("id", id)
                   : sb.from("contab_centros_costo").insert(payload);
      const { error } = await q; if (error) throw error;
    },
    onSuccess: () => { inval(qc); toast.success("Centro guardado"); }, onError: err,
  });
};

export const useSaveSubcentro = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<SubcentroCosto>) => {
      const { id, ...rest } = s;
      const payload = { ...rest, vigente_hasta: rest.vigente_hasta || null, obra_id: rest.obra_id || null, maquinaria_id: rest.maquinaria_id || null };
      const q = id ? sb.from("contab_subcentros_costo").update(payload).eq("id", id)
                   : sb.from("contab_subcentros_costo").insert(payload);
      const { error } = await q; if (error) throw error;
    },
    onSuccess: () => { inval(qc); toast.success("Subcentro guardado"); }, onError: err,
  });
};

export const useDeleteSubcentro = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("contab_subcentros_costo").delete().eq("id", id); if (error) throw error;
    },
    onSuccess: () => { inval(qc); toast.success("Subcentro eliminado"); }, onError: err,
  });
};

export const useImputacionesAsiento = (lineaIds: string[]) => useQuery({
  queryKey: ["contab_imputaciones", lineaIds.join(",")], enabled: lineaIds.length > 0,
  queryFn: async () => {
    const { data, error } = await sb.from("contab_imputaciones_analiticas").select("*").in("linea_id", lineaIds).order("created_at");
    if (error) throw error; return (data ?? []) as Imputacion[];
  },
});

export const useAddImputacion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { linea_id: string; subcentro_id: string; naturaleza: "ingreso" | "gasto"; importe: number; obra_id?: string | null; obra_atribucion?: "economica" | "informativa" | null; nota?: string | null }) => {
      const { error } = await sb.from("contab_imputaciones_analiticas").insert({
        ...i, obra_id: i.obra_id || null, obra_atribucion: i.obra_id ? (i.obra_atribucion ?? "informativa") : null, nota: i.nota || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contab_imputaciones"] }); toast.success("Imputación agregada"); }, onError: err,
  });
};

export const useDeleteImputacion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("contab_imputaciones_analiticas").delete().eq("id", id); if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contab_imputaciones"] }), onError: err,
  });
};
