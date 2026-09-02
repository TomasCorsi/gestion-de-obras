import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizarNombre, remitoEsDeObra } from "@/lib/obraMatch";

export interface HistoricoObra {
  movimientos: number;
  m3: number;
  horas: number;
  litros: number;
  viajes: number;
  gastos: number;
  maquinarias: number;
  personal: number;
}

export type HistoricoTablero = Record<string, HistoricoObra>;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let page = 0; page < 40; page++) {
    const { data, error } = await build(page * PAGE, page * PAGE + PAGE - 1);
    if (error) break;
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const fetchHistorico = async (
  obras: { obraId: string; nombre: string }[]
): Promise<HistoricoTablero> => {
  if (obras.length === 0) return {};
  const obraIds = obras.map((o) => o.obraId);

  const [partes, remitos, cargas, gastos] = await Promise.all([
    fetchAll<any>((from, to) =>
      supabase
        .from("partes_diarios")
        .select(
          "obra_id, personal_id, maquinaria_id, cantidad_viajes, cantidad_movimiento_interno, horometro_inicio, horometro_fin"
        )
        .in("obra_id", obraIds)
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase.from("remitos").select("obra_id, cantidad, cantidad_viajes, desde, hasta").range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase.from("cargas_combustible_repartidor").select("obra_id, litros").in("obra_id", obraIds).range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase.from("otros_gastos").select("obra_id, monto").in("obra_id", obraIds).range(from, to)
    ),
  ]);

  const out: HistoricoTablero = {};

  obras.forEach((o) => {
    const norm = normalizarNombre(o.nombre);
    const p = partes.filter((x) => x.obra_id === o.obraId);
    const r = remitos.filter((x) => remitoEsDeObra(x, o.obraId, norm));

    const viajes = r.reduce((s, x) => s + (num(x.cantidad_viajes) || 1), 0);

    out[o.obraId] = {
      movimientos:
        p.reduce((s, x) => s + num(x.cantidad_viajes) + num(x.cantidad_movimiento_interno), 0) + viajes,
      m3: r.reduce((s, x) => s + num(x.cantidad), 0),
      horas: p.reduce((s, x) => {
        const h = num(x.horometro_fin) - num(x.horometro_inicio);
        return s + (h > 0 && h < 24 ? h : 0);
      }, 0),
      litros: cargas.filter((x) => x.obra_id === o.obraId).reduce((s, x) => s + num(x.litros), 0),
      viajes,
      gastos: gastos.filter((x) => x.obra_id === o.obraId).reduce((s, x) => s + num(x.monto), 0),
      maquinarias: new Set(p.map((x) => x.maquinaria_id).filter(Boolean)).size,
      personal: new Set(p.map((x) => x.personal_id).filter(Boolean)).size,
    };
  });

  return out;
};

export function useTableroHistorico(obras: { obraId: string; nombre: string }[]) {
  const key = obras.map((o) => o.obraId).sort();
  const { data, isLoading } = useQuery({
    queryKey: ["tablero-historico", key],
    queryFn: () => fetchHistorico(obras),
    enabled: obras.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  return { historico: data || {}, loading: isLoading };
}
