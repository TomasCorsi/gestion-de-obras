import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface ContabEjercicio {
  id: string; nombre: string; fecha_desde: string; fecha_hasta: string;
  estado: "abierto" | "cerrado"; ultimo_numero: number;
}
export interface ContabPeriodo {
  id: string; ejercicio_id: string; anio: number; mes: number;
  fecha_desde: string; fecha_hasta: string; estado: "abierto" | "cerrado";
  cerrado_at: string | null; reabierto_at: string | null; motivo_reapertura: string | null;
}

const invalidarTodo = (qc: ReturnType<typeof useQueryClient>) => {
  ["contab_ejercicios", "contab_periodos", "contab_asientos", "contab_libro_diario", "contab_balance", "contab_mayor"]
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

const errMsg = (e: any) => e?.message ?? "Error inesperado";

export const useEjercicios = () =>
  useQuery({
    queryKey: ["contab_ejercicios"],
    queryFn: async () => {
      const { data, error } = await sb.from("contab_ejercicios").select("*").order("fecha_desde", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContabEjercicio[];
    },
  });

export const usePeriodos = (ejercicioId: string | null) =>
  useQuery({
    queryKey: ["contab_periodos", ejercicioId],
    enabled: !!ejercicioId,
    queryFn: async () => {
      const { data, error } = await sb.from("contab_periodos").select("*").eq("ejercicio_id", ejercicioId).order("fecha_desde");
      if (error) throw error;
      return (data ?? []) as ContabPeriodo[];
    },
  });

const useRpc = <T,>(fn: string, okMsg: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: T) => {
      const { data, error } = await sb.rpc(fn, args);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidarTodo(qc); toast.success(okMsg); },
    onError: (e) => toast.error(errMsg(e)),
  });
};

export const useCrearEjercicio = () =>
  useRpc<{ _nombre: string; _desde: string; _hasta: string }>("contab_crear_ejercicio", "Ejercicio creado con sus períodos");
export const useCerrarPeriodo = () => useRpc<{ _periodo_id: string }>("contab_cerrar_periodo", "Período cerrado");
export const useReabrirPeriodo = () =>
  useRpc<{ _periodo_id: string; _motivo: string }>("contab_reabrir_periodo", "Período reabierto");
export const useConfirmarAsiento = () => useRpc<{ _asiento_id: string }>("contab_confirmar_asiento", "Asiento confirmado");
export const useDescartarAsiento = () => useRpc<{ _asiento_id: string }>("contab_descartar_asiento", "Borrador descartado");
export const useRevertirAsiento = () =>
  useRpc<{ _asiento_id: string; _motivo: string; _fecha?: string | null }>("contab_revertir_asiento", "Asiento revertido");

/** Libro diario: asientos confirmados/revertidos con sus líneas en un rango */
export const useLibroDiario = (desde: string, hasta: string) =>
  useQuery({
    queryKey: ["contab_libro_diario", desde, hasta],
    queryFn: async () => {
      const { data, error } = await sb
        .from("contab_asientos")
        .select("id,fecha,descripcion,numero_ejercicio,estado,total_debe,total_haber,lineas:contab_asiento_lineas(id,orden,debe,haber,descripcion,cuenta:contab_plan_cuentas(codigo,nombre))")
        .in("estado", ["confirmado", "revertido"])
        .gte("fecha", desde).lte("fecha", hasta)
        .order("fecha").order("numero_ejercicio");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

/** Balance de sumas y saldos (solo asientos confirmados o revertidos) */
export const useBalanceSumasSaldos = (desde: string, hasta: string) =>
  useQuery({
    queryKey: ["contab_balance", desde, hasta],
    queryFn: async () => {
      const rows: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb
          .from("contab_asiento_lineas")
          .select("debe,haber,cuenta:contab_plan_cuentas(id,codigo,nombre),asiento:contab_asientos!inner(fecha,estado)")
          .in("asiento.estado", ["confirmado", "revertido"])
          .gte("asiento.fecha", desde).lte("asiento.fecha", hasta)
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return agruparBalance(rows);
    },
  });

export interface BalanceFila { codigo: string; nombre: string; debe: number; haber: number; saldo: number }

export function agruparBalance(rows: { debe: number; haber: number; cuenta: { codigo: string; nombre: string } | null }[]): BalanceFila[] {
  const map = new Map<string, BalanceFila>();
  for (const r of rows) {
    const codigo = r.cuenta?.codigo ?? "—";
    const f = map.get(codigo) ?? { codigo, nombre: r.cuenta?.nombre ?? "Sin cuenta", debe: 0, haber: 0, saldo: 0 };
    f.debe += Number(r.debe || 0);
    f.haber += Number(r.haber || 0);
    f.saldo = Math.round((f.debe - f.haber) * 100) / 100;
    map.set(codigo, f);
  }
  return [...map.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
}

export interface MayorFila { id: string; fecha: string; numero: number | null; concepto: string; estado: string; debe: number; haber: number; saldo: number }

/** Ordena cronológicamente y calcula saldo acumulado (debe - haber) */
export function mayorConSaldo(rows: any[]): MayorFila[] {
  const ord = [...rows].sort((a, b) =>
    a.asiento.fecha.localeCompare(b.asiento.fecha) || (a.asiento.numero_ejercicio ?? 0) - (b.asiento.numero_ejercicio ?? 0) || (a.orden ?? 0) - (b.orden ?? 0));
  let saldo = 0;
  return ord.map((r) => {
    saldo = Math.round((saldo + Number(r.debe || 0) - Number(r.haber || 0)) * 100) / 100;
    return { id: r.id, fecha: r.asiento.fecha, numero: r.asiento.numero_ejercicio ?? null, concepto: r.descripcion || r.asiento.descripcion,
      estado: r.asiento.estado, debe: Number(r.debe || 0), haber: Number(r.haber || 0), saldo };
  });
}
