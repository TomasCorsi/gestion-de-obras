import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tipos de material personalizados agregados por los usuarios al cargar remitos.
 * Se persisten en la tabla remito_tipos_material y quedan disponibles
 * en el desplegable para todos los usuarios.
 */
export function useTiposMaterial() {
  const [tipos, setTipos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTipos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("remito_tipos_material")
        .select("nombre")
        .order("nombre");
      if (error) throw error;
      setTipos((data ?? []).map((d) => d.nombre));
    } catch {
      setTipos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTipos();
  }, [fetchTipos]);

  const addTipo = useCallback(async (nombre: string) => {
    const clean = nombre.trim();
    if (!clean) return;
    setTipos((prev) =>
      prev.some((t) => t.toLowerCase() === clean.toLowerCase()) ? prev : [...prev, clean]
    );
    const { error } = await supabase
      .from("remito_tipos_material")
      .upsert({ nombre: clean }, { onConflict: "nombre", ignoreDuplicates: true });
    if (error) {
      // Revertir el agregado optimista si falla (permiso, conexión, etc.)
      setTipos((prev) => prev.filter((t) => t.toLowerCase() !== clean.toLowerCase()));
    }
  }, []);

  return { tipos, addTipo, loading, refetch: fetchTipos };
}
