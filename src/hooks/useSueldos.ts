import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SueldoDB {
  id: string;
  personal_id: string | null;
  legajo: string;
  nombre: string | null;
  sueldo_blanco: number;
  sueldo_negro: number;
  modalidad_pago: string;
  periodo: string;
  created_at: string;
  updated_at: string;
}

export function useSueldos(periodo: string) {
  const queryClient = useQueryClient();

  const { data: sueldos = [], isLoading } = useQuery({
    queryKey: ["sueldos", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sueldos")
        .select("*")
        .eq("periodo", periodo)
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data as SueldoDB[];
    },
    enabled: !!periodo,
  });

  const upsertSueldos = useMutation({
    mutationFn: async (rows: Omit<SueldoDB, "id" | "created_at" | "updated_at">[]) => {
      // Delete existing for this period first
      const { error: delError } = await supabase
        .from("sueldos")
        .delete()
        .eq("periodo", rows[0]?.periodo || periodo);
      if (delError) throw delError;

      // Insert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("sueldos").insert(batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sueldos", periodo] });
      toast.success("Sueldos importados correctamente");
    },
    onError: (err: Error) => {
      toast.error("Error al importar sueldos: " + err.message);
    },
  });

  const deletePeriodo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("sueldos")
        .delete()
        .eq("periodo", periodo);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sueldos", periodo] });
      toast.success("Período eliminado");
    },
    onError: (err: Error) => {
      toast.error("Error: " + err.message);
    },
  });

  return { sueldos, isLoading, upsertSueldos, deletePeriodo };
}
