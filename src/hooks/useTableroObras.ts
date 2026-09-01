import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth } from "date-fns";

export interface ObraTableroData {
  obraId: string;
  nombre: string;
  estado: string;
  ubicacion: string | null;
  movimientosHoy: number;
  m3Hoy: number;
  m3Mes: number;
  maquinariasTotal: number;
  maquinariasEnUso: number;
  horasHoy: number;
  horasMes: number;
  personalHoy: number;
  gastosMes: number;
  alertas: string[];
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

const fetchTablero = async (obraIds: string[]): Promise<ObraTableroData[]> => {
  if (obraIds.length === 0) return [];

  const hoy = format(new Date(), "yyyy-MM-dd");
  const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [obrasRes, partesRes, remitosRes, maqRes, gastosRes] = await Promise.all([
    supabase.from("obras").select("id, nombre, estado, ubicacion").in("id", obraIds),
    supabase
      .from("partes_diarios")
      .select("obra_id, fecha, personal_id, cantidad_viajes, cantidad_movimiento_interno, horometro_inicio, horometro_fin, estado_maquina, observacion_maquina")
      .in("obra_id", obraIds)
      .gte("fecha", inicioMes),
    supabase
      .from("remitos")
      .select("obra_id, fecha, cantidad, precio_total")
      .in("obra_id", obraIds)
      .gte("fecha", inicioMes),
    supabase
      .from("maquinarias")
      .select("id, obra_id, estado")
      .in("obra_id", obraIds),
    supabase
      .from("otros_gastos")
      .select("obra_id, fecha, monto")
      .in("obra_id", obraIds)
      .gte("fecha", inicioMes),
  ]);

  const maquinarias = (maqRes.data || []) as { id: string; obra_id: string | null; estado: string }[];
  const maqIds = maquinarias.map((m) => m.id);

  let mantenimientos: { maquinaria_id: string; costo_total: number | null }[] = [];
  if (maqIds.length > 0) {
    const { data } = await supabase
      .from("mantenimientos")
      .select("maquinaria_id, costo_total")
      .in("maquinaria_id", maqIds)
      .gte("fecha", inicioMes);
    mantenimientos = (data || []) as typeof mantenimientos;
  }

  const maqObra: Record<string, string | null> = {};
  maquinarias.forEach((m) => (maqObra[m.id] = m.obra_id));

  const partes = (partesRes.data || []) as any[];
  const remitos = (remitosRes.data || []) as any[];
  const gastos = (gastosRes.data || []) as any[];

  return ((obrasRes.data || []) as any[]).map((obra) => {
    const partesObra = partes.filter((p) => p.obra_id === obra.id);
    const partesHoy = partesObra.filter((p) => p.fecha === hoy);
    const remitosObra = remitos.filter((r) => r.obra_id === obra.id);
    const remitosHoy = remitosObra.filter((r) => r.fecha === hoy);
    const maqObraList = maquinarias.filter((m) => m.obra_id === obra.id);

    const horas = (arr: any[]) =>
      arr.reduce((sum, p) => {
        const h = num(p.horometro_fin) - num(p.horometro_inicio);
        return sum + (h > 0 && h < 24 ? h : 0);
      }, 0);

    const movimientosHoy =
      partesHoy.reduce((s, p) => s + num(p.cantidad_viajes) + num(p.cantidad_movimiento_interno), 0) +
      remitosHoy.length;

    const gastosMes =
      gastos.filter((g) => g.obra_id === obra.id).reduce((s, g) => s + num(g.monto), 0) +
      mantenimientos
        .filter((m) => maqObra[m.maquinaria_id] === obra.id)
        .reduce((s, m) => s + num(m.costo_total), 0);

    const alertas = partesHoy
      .filter((p) => p.estado_maquina === "OBSERVACION")
      .map((p) => p.observacion_maquina || "Máquina con observación")
      .slice(0, 3);

    return {
      obraId: obra.id,
      nombre: obra.nombre,
      estado: obra.estado,
      ubicacion: obra.ubicacion,
      movimientosHoy,
      m3Hoy: remitosHoy.reduce((s, r) => s + num(r.cantidad), 0),
      m3Mes: remitosObra.reduce((s, r) => s + num(r.cantidad), 0),
      maquinariasTotal: maqObraList.length,
      maquinariasEnUso: maqObraList.filter((m) => m.estado === "en_uso" || m.estado === "operativa").length,
      horasHoy: horas(partesHoy),
      horasMes: horas(partesObra),
      personalHoy: new Set(partesHoy.map((p) => p.personal_id)).size,
      gastosMes,
      alertas,
    };
  });
};

export function useTableroObras(obraIds: string[], refetchInterval?: number) {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["tablero-obras", [...obraIds].sort()],
    queryFn: () => fetchTablero(obraIds),
    enabled: obraIds.length > 0,
    refetchInterval,
    refetchOnWindowFocus: true,
  });

  // Mantiene el orden elegido por el usuario
  const ordenadas = obraIds
    .map((id) => (data || []).find((o) => o.obraId === id))
    .filter(Boolean) as ObraTableroData[];

  return { obras: ordenadas, loading: isLoading, refetch, dataUpdatedAt };
}
