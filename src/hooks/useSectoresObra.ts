import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { esSectorNuevo, sectoresDeObra, type SectorObraRow } from "@/lib/sectoresObra";

const KEY = ["remito_sectores_obra"];

/** Sectores de obra cargados en remitos; cada obra tiene su propia lista. */
export function useSectoresObra(obraId: string | null | undefined) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("remito_sectores_obra").select("obra_id,nombre").order("nombre");
      if (error) throw error;
      return (data ?? []) as SectorObraRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
  const sectores = sectoresDeObra(data, obraId);

  const addSector = async (nombre: string) => {
    const clean = nombre.trim();
    if (!obraId || !esSectorNuevo(sectores, clean)) return;
    qc.setQueryData<SectorObraRow[]>(KEY, (old = []) => [...old, { obra_id: obraId, nombre: clean }]);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("remito_sectores_obra").insert({ obra_id: obraId, nombre: clean, created_by: auth.user?.id ?? null });
    if (error && error.code !== "23505") qc.invalidateQueries({ queryKey: KEY });
  };

  return { sectores, addSector };
}
