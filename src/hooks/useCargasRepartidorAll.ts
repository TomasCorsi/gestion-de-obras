import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export interface CargaRepartidorFull {
  id: string;
  parte_diario_id: string | null;
  fecha: string;
  litros: number;
  horas: number | null;
  km: number | null;
  operador_id: string | null;
  maquinaria_id: string | null;
  obra_id: string | null;
  tipo_operador: string | null;
  tipo_producto: string | null;
  repartidor_id: string | null;
  observaciones: string | null;
  numero_remito: number | null;
  created_at: string;
  updated_at: string | null;
  operador?: { nombre: string | null; apellido: string | null } | null;
  maquinaria?: { codigo: string | null; tipo: string; nombre: string | null } | null;
  obra?: { nombre: string } | null;
  parte_diario?: { personal: { nombre: string | null; apellido: string | null } | null } | null;
  repartidor?: { nombre: string | null; apellido: string | null } | null;
}
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

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('cargas_combustible_repartidor')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor'] });
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor_all'] });
      toast.success('Entrega actualizada');
    },
    onError: () => toast.error('Error al actualizar entrega'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cargas_combustible_repartidor')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor'] });
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor_all'] });
      toast.success('Entrega eliminada');
    },
    onError: () => toast.error('Error al eliminar entrega'),
  });

  const totalLitros = cargas.reduce((sum, c) => sum + (c.litros || 0), 0);

  return {
    cargas,
    isLoading,
    totalLitros,
    updateCarga: updateMutation.mutateAsync,
    deleteCarga: deleteMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
