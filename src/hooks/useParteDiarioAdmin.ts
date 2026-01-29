import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ParteDiario } from './useParteDiario';

export interface ParteDiarioAdminFilters {
  empleadoId?: string;
  obraId?: string;
  estado?: 'borrador' | 'completado' | '';
  fechaDesde?: string;
  fechaHasta?: string;
}

export function useParteDiarioAdmin(filters: ParteDiarioAdminFilters = {}) {
  const { data: partes = [], isLoading, error } = useQuery({
    queryKey: ['partes_diarios_admin', filters],
    queryFn: async () => {
      let query = supabase
        .from('partes_diarios')
        .select(`
          *,
          personal:personal_id (id, nombre, apellido, rol),
          obras:obra_id (id, nombre),
          maquinarias:maquinaria_id (id, codigo, tipo, patente)
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.empleadoId) {
        query = query.eq('personal_id', filters.empleadoId);
      }
      if (filters.obraId) {
        query = query.eq('obra_id', filters.obraId);
      }
      if (filters.estado) {
        query = query.eq('estado', filters.estado);
      }
      if (filters.fechaDesde) {
        query = query.gte('fecha', filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        query = query.lte('fecha', filters.fechaHasta);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as ParteDiario[];
    },
  });

  return {
    partes,
    isLoading,
    error,
  };
}
