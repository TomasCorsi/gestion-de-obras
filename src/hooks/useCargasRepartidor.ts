import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CargaRepartidor {
  id: string;
  parte_diario_id: string;
  fecha: string;
  operador_id: string | null;
  maquinaria_id: string | null;
  obra_id: string | null;
  litros: number;
  horas: number | null;
  km: number | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  operador?: { nombre: string | null; apellido: string | null } | null;
  maquinaria?: { codigo: string | null; tipo: string } | null;
  obra?: { nombre: string } | null;
}

export interface CargaRepartidorInsert {
  parte_diario_id: string;
  fecha: string;
  operador_id?: string | null;
  maquinaria_id?: string | null;
  obra_id?: string | null;
  litros: number;
  horas?: number | null;
  km?: number | null;
  observaciones?: string | null;
}

export function useCargasRepartidor(parteDiarioId: string | null) {
  const queryClient = useQueryClient();

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['cargas_combustible_repartidor', parteDiarioId],
    queryFn: async () => {
      if (!parteDiarioId) return [];
      
      const { data, error } = await supabase
        .from('cargas_combustible_repartidor')
        .select(`
          *,
          operador:personal!cargas_combustible_repartidor_operador_id_fkey(nombre, apellido),
          maquinaria:maquinarias!cargas_combustible_repartidor_maquinaria_id_fkey(codigo, tipo),
          obra:obras!cargas_combustible_repartidor_obra_id_fkey(nombre)
        `)
        .eq('parte_diario_id', parteDiarioId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching cargas repartidor:', error);
        throw error;
      }

      return data as CargaRepartidor[];
    },
    enabled: !!parteDiarioId,
  });

  const createMutation = useMutation({
    mutationFn: async (carga: CargaRepartidorInsert) => {
      const { data, error } = await supabase
        .from('cargas_combustible_repartidor')
        .insert(carga)
        .select(`
          *,
          operador:personal!cargas_combustible_repartidor_operador_id_fkey(nombre, apellido),
          maquinaria:maquinarias!cargas_combustible_repartidor_maquinaria_id_fkey(codigo, tipo),
          obra:obras!cargas_combustible_repartidor_obra_id_fkey(nombre)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor', parteDiarioId] });
      toast.success('Carga registrada');
    },
    onError: (error) => {
      console.error('Error creating carga:', error);
      toast.error('Error al registrar carga');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CargaRepartidorInsert> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('cargas_combustible_repartidor')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          operador:personal!cargas_combustible_repartidor_operador_id_fkey(nombre, apellido),
          maquinaria:maquinarias!cargas_combustible_repartidor_maquinaria_id_fkey(codigo, tipo),
          obra:obras!cargas_combustible_repartidor_obra_id_fkey(nombre)
        `)
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor', parteDiarioId] });
      toast.success('Carga actualizada');
    },
    onError: (error) => {
      console.error('Error updating carga:', error);
      toast.error('Error al actualizar carga');
    },
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
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor', parteDiarioId] });
      toast.success('Carga eliminada');
    },
    onError: (error) => {
      console.error('Error deleting carga:', error);
      toast.error('Error al eliminar carga');
    },
  });

  const totalLitros = cargas.reduce((sum, c) => sum + (c.litros || 0), 0);

  return {
    cargas,
    isLoading,
    totalLitros,
    createCarga: createMutation.mutateAsync,
    updateCarga: updateMutation.mutateAsync,
    deleteCarga: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
