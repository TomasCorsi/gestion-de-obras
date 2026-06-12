import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { toast } from "sonner";
import type { EmpleadoDocumento } from "./useEmpleadoDocumentos";

const BUCKET = "empleado-documentos";

export function useMisDocumentos() {
  const { user, loading: authLoading } = useAuth();
  const { empleado } = useEmpleadoProfile();
  const qc = useQueryClient();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const list = useQuery({
    queryKey: ["mis_documentos", user?.id],
    // Esperar a que la sesión esté restaurada antes de consultar — evita race con RLS (auth.uid() null)
    enabled: !authLoading && !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 60_000,
    staleTime: 0,
    retry: 2,
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

  // Track seen IDs and notify on truly new ones
  useEffect(() => {
    if (!list.data) return;
    if (!initializedRef.current) {
      list.data.forEach((d) => seenIdsRef.current.add(d.id));
      initializedRef.current = true;
      return;
    }
    list.data.forEach((d) => {
      if (!seenIdsRef.current.has(d.id)) {
        seenIdsRef.current.add(d.id);
        toast.success("Nuevo documento disponible", {
          description: d.titulo,
        });
      }
    });
  }, [list.data]);

  // Realtime: subscribe to inserts/updates/deletes for this empleado's documents
  useEffect(() => {
    const personalId = empleado?.id;
    if (!personalId) return;

    const channel = supabase
      .channel(`empleado_documentos:${personalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "empleado_documentos",
          filter: `personal_id=eq.${personalId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["mis_documentos"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [empleado?.id, qc]);

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
