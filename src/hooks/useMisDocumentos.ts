import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { EmpleadoDocumento } from "./useEmpleadoDocumentos";

const BUCKET = "empleado-documentos";

export function useMisDocumentos() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["mis_documentos", user?.id],
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleado_documentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EmpleadoDocumento[];
    },
  });

  const docs = list.data || [];
  const pendientesCount = docs.filter(
    (d) => !d.visto_at || (d.tipo === "recibo_sueldo" && !d.firmado_at)
  ).length;

  const markVisto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("empleado_documentos")
        .update({ visto_at: new Date().toISOString() })
        .eq("id", id)
        .is("visto_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mis_documentos"] }),
    onError: (e: any) => toast.error(e?.message || "Error al marcar como visto"),
  });

  const firmar = useMutation({
    mutationFn: async (args: { id: string; firma_data_url: string }) => {
      let ip: string | null = null;
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        const j = await r.json();
        ip = j?.ip || null;
      } catch {}
      const { error } = await supabase
        .from("empleado_documentos")
        .update({
          firma_data_url: args.firma_data_url,
          firmado_at: new Date().toISOString(),
          firmado_ip: ip,
          visto_at: new Date().toISOString(),
        })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis_documentos"] });
      toast.success("Recibo firmado");
    },
    onError: (e: any) => toast.error(e?.message || "Error al firmar"),
  });

  const getDownloadUrl = async (doc: EmpleadoDocumento) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300);
    if (error) throw error;
    return data.signedUrl;
  };

  return {
    documentos: docs,
    pendientesCount,
    isLoading: list.isLoading,
    markVisto: markVisto.mutate,
    firmar: firmar.mutateAsync,
    isSigning: firmar.isPending,
    getDownloadUrl,
  };
}
