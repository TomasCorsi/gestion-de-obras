import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isAfter } from "date-fns";

export type MetricaSerie = "movimientos" | "m3" | "horas";

export interface SeriePunto {
  fecha: string; // yyyy-MM-dd
  label: string; // dd/MM
  [obraId: string]: number | string;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const fetchSeries = async (obraIds: string[], mes: string) => {
  if (obraIds.length === 0) return { movimientos: [], m3: [], horas: [] } as Record<MetricaSerie, SeriePunto[]>;

  const base = parseISO(`${mes}-01`);
  const hoy = new Date();
  const finReal = isAfter(endOfMonth(base), hoy) ? hoy : endOfMonth(base);
  const desde = format(startOfMonth(base), "yyyy-MM-dd");
  const hasta = format(finReal, "yyyy-MM-dd");

  const [partesRes, remitosRes] = await Promise.all([
    supabase
      .from("partes_diarios")
      .select("obra_id, fecha, cantidad_viajes, cantidad_movimiento_interno, horometro_inicio, horometro_fin")
      .in("obra_id", obraIds)
      .gte("fecha", desde)
      .lte("fecha", hasta),
    supabase
      .from("remitos")
      .select("obra_id, fecha, cantidad")
      .in("obra_id", obraIds)
      .gte("fecha", desde)
      .lte("fecha", hasta),
  ]);

  const partes = (partesRes.data || []) as any[];
  const remitos = (remitosRes.data || []) as any[];

  const dias: string[] = eachDayOfInterval({ start: startOfMonth(base), end: finReal }).map((d) =>
    format(d, "yyyy-MM-dd")
  );

  const build = (calc: (fecha: string, obraId: string) => number): SeriePunto[] =>
    dias.map((fecha) => {
      const punto: SeriePunto = { fecha, label: format(new Date(`${fecha}T00:00:00`), "dd/MM") };
      obraIds.forEach((id) => {
        punto[id] = Number(calc(fecha, id).toFixed(1));
      });
      return punto;
    });

  const movimientos = build((fecha, id) => {
    const p = partes.filter((x) => x.fecha === fecha && x.obra_id === id);
    const r = remitos.filter((x) => x.fecha === fecha && x.obra_id === id);
    return (
      p.reduce((s, x) => s + num(x.cantidad_viajes) + num(x.cantidad_movimiento_interno), 0) + r.length
    );
  });

  const m3 = build((fecha, id) =>
    remitos.filter((x) => x.fecha === fecha && x.obra_id === id).reduce((s, x) => s + num(x.cantidad), 0)
  );

  const horas = build((fecha, id) =>
    partes
      .filter((x) => x.fecha === fecha && x.obra_id === id)
      .reduce((s, x) => {
        const h = num(x.horometro_fin) - num(x.horometro_inicio);
        return s + (h > 0 && h < 24 ? h : 0);
      }, 0)
  );

  return { movimientos, m3, horas } as Record<MetricaSerie, SeriePunto[]>;
};

export function useTableroSeries(obraIds: string[], mes: string, refetchInterval?: number) {
  const { data, isLoading } = useQuery({
    queryKey: ["tablero-series", [...obraIds].sort(), mes],
    queryFn: () => fetchSeries(obraIds, mes),
    enabled: obraIds.length > 0,
    refetchInterval,
    refetchOnWindowFocus: true,
  });

  return {
    series: data || ({ movimientos: [], m3: [], horas: [] } as Record<MetricaSerie, SeriePunto[]>),
    loading: isLoading,
  };
}

export const SERIE_COLORS = ["#B00020", "#E4A11B", "#6B7280"];
