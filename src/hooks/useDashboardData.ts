import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

interface ObraWithRelations {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: "activa" | "pendiente" | "finalizada" | "pausada";
  fecha_inicio: string | null;
  responsable?: { nombre: string; apellido: string } | null;
}

interface MaquinariaWithRelations {
  id: string;
  nombre: string | null;
  codigo: string | null;
  tipo: string;
  estado: "operativa" | "mantenimiento" | "inactiva" | "en_uso";
  horas_acumuladas: number;
  obra?: { nombre: string } | null;
}

interface CotizacionPendiente {
  id: string;
  numero: string;
  descripcion: string;
  total: number;
  fecha_vencimiento: string;
  obra?: { nombre: string } | null;
}

interface ViajesPorDia {
  dia: string;
  viajes: number;
  volumen: number;
}

interface DashboardStats {
  obrasActivas: number;
  maquinariasTotal: number;
  maquinariasOperativas: number;
  viajesHoy: number;
  volumenHoy: number;
  cotizacionesPendientes: number;
  personalActivo: number;
  facturacionMes: number;
}

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    obrasActivas: 0,
    maquinariasTotal: 0,
    maquinariasOperativas: 0,
    viajesHoy: 0,
    volumenHoy: 0,
    cotizacionesPendientes: 0,
    personalActivo: 0,
    facturacionMes: 0,
  });
  const [obrasRecientes, setObrasRecientes] = useState<ObraWithRelations[]>([]);
  const [maquinarias, setMaquinarias] = useState<MaquinariaWithRelations[]>([]);
  const [cotizaciones, setCotizaciones] = useState<CotizacionPendiente[]>([]);
  const [viajesSemana, setViajesSemana] = useState<ViajesPorDia[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 1 });

      // Fetch all data in parallel
      const [
        obrasResult,
        maquinariasResult,
        viajesHoyResult,
        viajesSemanaResult,
        cotizacionesResult,
        personalResult,
        combustibleResult,
      ] = await Promise.all([
        // Obras recientes
        supabase
          .from("obras")
          .select("id, nombre, ubicacion, estado, fecha_inicio, responsable:personal(nombre, apellido)")
          .order("created_at", { ascending: false })
          .limit(5),
        
        // Maquinarias
        supabase
          .from("maquinarias")
          .select("id, nombre, codigo, tipo, estado, horas_acumuladas, obra:obras(nombre)")
          .order("nombre"),
        
        // Viajes de hoy
        supabase
          .from("viajes")
          .select("id, volumen")
          .eq("fecha", today),
        
        // Viajes de la semana
        supabase
          .from("viajes")
          .select("fecha, volumen")
          .gte("fecha", format(startOfCurrentWeek, "yyyy-MM-dd"))
          .lte("fecha", format(endOfCurrentWeek, "yyyy-MM-dd")),
        
        // Cotizaciones pendientes
        supabase
          .from("cotizaciones")
          .select("id, numero, descripcion, total, fecha_vencimiento, obra:obras(nombre)")
          .in("estado", ["borrador", "enviada"])
          .order("fecha_vencimiento", { ascending: true })
          .limit(5),
        
        // Personal activo
        supabase
          .from("personal")
          .select("id")
          .eq("activo", true),
        
        // Facturación del mes (cotizaciones aprobadas)
        supabase
          .from("cotizaciones")
          .select("total")
          .eq("estado", "aprobada"),
      ]);

      // Process obras
      if (obrasResult.data) {
        setObrasRecientes(obrasResult.data as ObraWithRelations[]);
      }

      // Process maquinarias
      if (maquinariasResult.data) {
        setMaquinarias(maquinariasResult.data as MaquinariaWithRelations[]);
      }

      // Process cotizaciones
      if (cotizacionesResult.data) {
        setCotizaciones(cotizacionesResult.data as CotizacionPendiente[]);
      }

      // Process viajes de la semana
      if (viajesSemanaResult.data) {
        const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
        const viajesPorDia: ViajesPorDia[] = diasSemana.map((dia, index) => {
          const fechaDia = format(
            new Date(startOfCurrentWeek.getTime() + index * 24 * 60 * 60 * 1000),
            "yyyy-MM-dd"
          );
          const viajesDelDia = viajesSemanaResult.data.filter(
            (v: any) => v.fecha === fechaDia
          );
          return {
            dia,
            viajes: viajesDelDia.length,
            volumen: viajesDelDia.reduce((sum: number, v: any) => sum + (v.volumen || 0), 0),
          };
        });
        setViajesSemana(viajesPorDia);
      }

      // Calculate stats
      const obrasActivas = obrasResult.data?.filter((o: any) => o.estado === "activa").length || 0;
      const maquinariasTotal = maquinariasResult.data?.length || 0;
      const maquinariasOperativas = maquinariasResult.data?.filter(
        (m: any) => m.estado === "operativa" || m.estado === "en_uso"
      ).length || 0;
      const viajesHoy = viajesHoyResult.data?.length || 0;
      const volumenHoy = viajesHoyResult.data?.reduce((sum: number, v: any) => sum + (v.volumen || 0), 0) || 0;
      const cotizacionesPendientes = cotizacionesResult.data?.length || 0;
      const personalActivo = personalResult.data?.length || 0;
      const facturacionMes = combustibleResult.data?.reduce((sum: number, c: any) => sum + (c.total || 0), 0) || 0;

      setStats({
        obrasActivas,
        maquinariasTotal,
        maquinariasOperativas,
        viajesHoy,
        volumenHoy,
        cotizacionesPendientes,
        personalActivo,
        facturacionMes,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    loading,
    stats,
    obrasRecientes,
    maquinarias,
    cotizaciones,
    viajesSemana,
    refetch: fetchDashboardData,
  };
}

export function useReportesData() {
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<any[]>([]);
  const [maquinarias, setMaquinarias] = useState<any[]>([]);
  const [viajes, setViajes] = useState<any[]>([]);
  const [combustible, setCombustible] = useState<any[]>([]);
  const [mantenimientos, setMantenimientos] = useState<any[]>([]);

  const fetchReportesData = async () => {
    try {
      setLoading(true);
      const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
      const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 1 });

      const [obrasResult, maquinariasResult, viajesResult, combustibleResult, mantenimientosResult] = await Promise.all([
        supabase.from("obras").select("*"),
        supabase.from("maquinarias").select("*"),
        supabase
          .from("viajes")
          .select("*")
          .gte("fecha", format(startOfCurrentWeek, "yyyy-MM-dd"))
          .lte("fecha", format(endOfCurrentWeek, "yyyy-MM-dd")),
        supabase.from("cargas_combustible").select("*"),
        supabase.from("mantenimientos").select("*"),
      ]);

      if (obrasResult.data) setObras(obrasResult.data);
      if (maquinariasResult.data) setMaquinarias(maquinariasResult.data);
      if (viajesResult.data) setViajes(viajesResult.data);
      if (combustibleResult.data) setCombustible(combustibleResult.data);
      if (mantenimientosResult.data) setMantenimientos(mantenimientosResult.data);
    } catch (error) {
      console.error("Error fetching reportes data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportesData();
  }, []);

  return {
    loading,
    obras,
    maquinarias,
    viajes,
    combustible,
    mantenimientos,
    refetch: fetchReportesData,
  };
}
