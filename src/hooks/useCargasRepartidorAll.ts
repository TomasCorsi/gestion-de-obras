import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CargaRepartidorFull {
  id: string;
  parte_diario_id: string | null;
  fecha: string;
  litros: number;
  horas: number | null;
  km: number | null;
  tipo_operador: string | null;
  tipo_producto: string | null;
  repartidor_id: string | null;
  observaciones: string | null;
  created_at: string;
  operador?: { nombre: string | null; apellido: string | null } | null;
  maquinaria?: { codigo: string | null; tipo: string; nombre: string | null } | null;
  obra?: { nombre: string } | null;
  parte_diario?: { personal: { nombre: string | null; apellido: string | null } | null } | null;
  repartidor?: { nombre: string | null; apellido: string | null } | null;
}

export function useCargasRepartidorAll() {
  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['cargas_combustible_repartidor_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargas_combustible_repartidor')
        .select(`
          *,
          operador:personal!cargas_combustible_repartidor_operador_id_fkey(nombre, apellido),
          maquinaria:maquinarias!cargas_combustible_repartidor_maquinaria_id_fkey(codigo, tipo, nombre),
          obra:obras!cargas_combustible_repartidor_obra_id_fkey(nombre),
          parte_diario:partes_diarios!cargas_combustible_repartidor_parte_diario_id_fkey(
            personal:personal!partes_diarios_personal_id_fkey(nombre, apellido)
          ),
          repartidor:personal!cargas_combustible_repartidor_repartidor_id_fkey(nombre, apellido)
        `)
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Error fetching all cargas repartidor:', error);
        throw error;
      }

      return data as CargaRepartidorFull[];
    },
  });

  const totalLitros = cargas.reduce((sum, c) => sum + (c.litros || 0), 0);

  return { cargas, isLoading, totalLitros };
}
