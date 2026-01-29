import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo';

export interface EmpleadoResumen {
  id: string;
  nombre: string | null;
  apellido: string | null;
  rol: RolPersonal;
  legajo: string | null;
  partesCompletados: number;
  partesBorrador: number;
  horasMaquinaTotales: number;
  viajesTotales: number;
  movimientoInternoTotal: number;
  combustibleTotal: number;
  checklistCumplimiento: number;
}

export interface ResumenGeneralData {
  empleados: EmpleadoResumen[];
  totales: {
    totalEmpleados: number;
    totalPartesCompletados: number;
    totalPartesBorrador: number;
    totalHorasMaquina: number;
    totalViajes: number;
    totalMovimientoInterno: number;
    totalCombustible: number;
    promedioChecklist: number;
  };
}

function calculateChecklistCumplimiento(partes: any[], rol: RolPersonal): number {
  if (partes.length === 0) return 0;
  
  let totalChecks = 0;
  let checksCompletos = 0;
  
  partes.forEach(parte => {
    if (rol === 'maquinista') {
      totalChecks += 4;
      if (parte.check_filtro_aire) checksCompletos++;
      if (parte.check_aceite_motor) checksCompletos++;
      if (parte.check_aceite_hidraulico) checksCompletos++;
      if (parte.check_liquido_refrigerante) checksCompletos++;
    } else if (rol === 'chofer') {
      totalChecks += 3;
      if (parte.check_aceite_motor) checksCompletos++;
      if (parte.check_liquido_refrigerante) checksCompletos++;
      if (parte.check_uria) checksCompletos++;
    }
  });
  
  if (totalChecks === 0) return 100;
  return Math.round((checksCompletos / totalChecks) * 100);
}

export function useParteDiarioResumenGeneral(mes: number, anio: number) {
  const fechaInicio = startOfMonth(new Date(anio, mes - 1));
  const fechaFin = endOfMonth(new Date(anio, mes - 1));
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['partes_diarios_resumen_general', mes, anio],
    queryFn: async () => {
      // Fetch all active employees
      const { data: empleadosData, error: empleadosError } = await supabase
        .from('personal')
        .select('id, nombre, apellido, rol, legajo')
        .eq('activo', true)
        .order('apellido');
      
      if (empleadosError) throw empleadosError;
      
      // Fetch all partes for the period
      const { data: partesData, error: partesError } = await supabase
        .from('partes_diarios')
        .select('*')
        .gte('fecha', format(fechaInicio, 'yyyy-MM-dd'))
        .lte('fecha', format(fechaFin, 'yyyy-MM-dd'));
      
      if (partesError) throw partesError;
      
      // Group partes by employee
      const partesPorEmpleado = new Map<string, any[]>();
      partesData?.forEach(parte => {
        const current = partesPorEmpleado.get(parte.personal_id) || [];
        current.push(parte);
        partesPorEmpleado.set(parte.personal_id, current);
      });
      
      // Calculate metrics for each employee
      const empleados: EmpleadoResumen[] = (empleadosData || []).map(emp => {
        const partes = partesPorEmpleado.get(emp.id) || [];
        const partesCompletados = partes.filter(p => p.estado === 'completado').length;
        const partesBorrador = partes.filter(p => p.estado === 'borrador').length;
        
        const horasMaquinaTotales = partes.reduce((sum, p) => {
          const horasM = (p.horometro_fin || 0) - (p.horometro_inicio || 0);
          return sum + Math.max(0, horasM);
        }, 0);
        
        const viajesTotales = partes.reduce((sum, p) => sum + (p.cantidad_viajes || 0), 0);
        const movimientoInternoTotal = partes.reduce((sum, p) => sum + (p.cantidad_movimiento_interno || 0), 0);
        const combustibleTotal = partes.reduce((sum, p) => sum + (p.combustible || 0), 0);
        const checklistCumplimiento = calculateChecklistCumplimiento(partes, emp.rol as RolPersonal);
        
        return {
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          rol: emp.rol as RolPersonal,
          legajo: emp.legajo,
          partesCompletados,
          partesBorrador,
          horasMaquinaTotales,
          viajesTotales,
          movimientoInternoTotal,
          combustibleTotal,
          checklistCumplimiento,
        };
      });
      
      // Filter only employees who have at least one parte
      const empleadosConPartes = empleados.filter(
        e => e.partesCompletados > 0 || e.partesBorrador > 0
      );
      
      // Calculate totals
      const totales = {
        totalEmpleados: empleadosConPartes.length,
        totalPartesCompletados: empleadosConPartes.reduce((sum, e) => sum + e.partesCompletados, 0),
        totalPartesBorrador: empleadosConPartes.reduce((sum, e) => sum + e.partesBorrador, 0),
        totalHorasMaquina: empleadosConPartes.reduce((sum, e) => sum + e.horasMaquinaTotales, 0),
        totalViajes: empleadosConPartes.reduce((sum, e) => sum + e.viajesTotales, 0),
        totalMovimientoInterno: empleadosConPartes.reduce((sum, e) => sum + e.movimientoInternoTotal, 0),
        totalCombustible: empleadosConPartes.reduce((sum, e) => sum + e.combustibleTotal, 0),
        promedioChecklist: empleadosConPartes.length > 0
          ? Math.round(empleadosConPartes.reduce((sum, e) => sum + e.checklistCumplimiento, 0) / empleadosConPartes.length)
          : 0,
      };
      
      return {
        empleados: empleadosConPartes,
        totales,
      } as ResumenGeneralData;
    },
  });
  
  return {
    data: data || {
      empleados: [],
      totales: {
        totalEmpleados: 0,
        totalPartesCompletados: 0,
        totalPartesBorrador: 0,
        totalHorasMaquina: 0,
        totalViajes: 0,
        totalMovimientoInterno: 0,
        totalCombustible: 0,
        promedioChecklist: 0,
      },
    },
    isLoading,
    error,
  };
}
