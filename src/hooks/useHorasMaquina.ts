import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HoraMaquina {
  id: string;
  maquinaria_id: string;
  obra_id: string;
  operador_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  horas_trabajadas: number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export function useHorasMaquina() {
  const [horasMaquina, setHorasMaquina] = useState<HoraMaquina[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHorasMaquina = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("horas_maquina")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error fetching horas maquina:", error);
      toast.error("Error al cargar horas de maquinaria");
    } else {
      setHorasMaquina(data || []);
    }
    setLoading(false);
  };

  // Get total hours by obra and maquinaria
  const getHorasPorObraYMaquinaria = (obraId: string, maquinariaId: string, fechaInicio?: string, fechaFin?: string) => {
    return horasMaquina
      .filter(h => {
        const matchesObra = h.obra_id === obraId;
        const matchesMaquinaria = h.maquinaria_id === maquinariaId;
        
        let matchesFecha = true;
        if (fechaInicio && h.fecha) {
          matchesFecha = matchesFecha && h.fecha >= fechaInicio;
        }
        if (fechaFin && h.fecha) {
          matchesFecha = matchesFecha && h.fecha <= fechaFin;
        }
        
        return matchesObra && matchesMaquinaria && matchesFecha;
      })
      .reduce((sum, h) => sum + (h.horas_trabajadas || 0), 0);
  };

  // Get total hours by obra
  const getHorasPorObra = (obraId: string, fechaInicio?: string, fechaFin?: string) => {
    return horasMaquina
      .filter(h => {
        const matchesObra = h.obra_id === obraId;
        
        let matchesFecha = true;
        if (fechaInicio && h.fecha) {
          matchesFecha = matchesFecha && h.fecha >= fechaInicio;
        }
        if (fechaFin && h.fecha) {
          matchesFecha = matchesFecha && h.fecha <= fechaFin;
        }
        
        return matchesObra && matchesFecha;
      })
      .reduce((sum, h) => sum + (h.horas_trabajadas || 0), 0);
  };

  useEffect(() => {
    fetchHorasMaquina();
  }, []);

  return {
    horasMaquina,
    loading,
    fetchHorasMaquina,
    getHorasPorObraYMaquinaria,
    getHorasPorObra,
  };
}
