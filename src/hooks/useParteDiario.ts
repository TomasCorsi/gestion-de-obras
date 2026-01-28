import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmpleadoProfile } from './useEmpleadoProfile';

export interface ParteDiario {
  id: string;
  fecha: string;
  personal_id: string;
  obra_id: string | null;
  maquinaria_id: string | null;
  hora_entrada: string | null;
  hora_salida: string | null;
  horometro_inicio: number;
  horometro_fin: number;
  cantidad_viajes: number;
  cantidad_movimiento_interno: number;
  combustible: number;
  estado_maquina: 'OK' | 'OBSERVACION' | null;
  observacion_maquina: string | null;
  check_filtro_aire: boolean;
  check_aceite_hidraulico: boolean;
  check_aceite_motor: boolean;
  check_liquido_refrigerante: boolean;
  check_uria: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  personal?: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    rol: string;
  };
  obras?: {
    id: string;
    nombre: string;
  } | null;
  maquinarias?: {
    id: string;
    codigo: string | null;
    tipo: string;
    patente: string | null;
  } | null;
}

export interface ParteDiarioInsert {
  fecha: string;
  personal_id: string;
  obra_id?: string | null;
  maquinaria_id?: string | null;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  horometro_inicio?: number;
  horometro_fin?: number;
  cantidad_viajes?: number;
  cantidad_movimiento_interno?: number;
  combustible?: number;
  estado_maquina?: 'OK' | 'OBSERVACION' | null;
  observacion_maquina?: string | null;
  check_filtro_aire?: boolean;
  check_aceite_hidraulico?: boolean;
  check_aceite_motor?: boolean;
  check_liquido_refrigerante?: boolean;
  check_uria?: boolean;
}

export function useParteDiario() {
  const queryClient = useQueryClient();
  const { empleado } = useEmpleadoProfile();

  // Fetch all partes for the current employee
  const { data: partes = [], isLoading, error } = useQuery({
    queryKey: ['partes_diarios', empleado?.id],
    enabled: !!empleado?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partes_diarios')
        .select(`
          *,
          personal:personal_id (id, nombre, apellido, rol),
          obras:obra_id (id, nombre),
          maquinarias:maquinaria_id (id, codigo, tipo, patente)
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ParteDiario[];
    },
  });

  // Create new parte
  const createMutation = useMutation({
    mutationFn: async (parte: ParteDiarioInsert) => {
      const { data, error } = await supabase
        .from('partes_diarios')
        .insert(parte)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      toast.success('Parte diario guardado exitosamente');
    },
    onError: (error: Error) => {
      console.error('Error creating parte:', error);
      toast.error('Error al guardar el parte diario');
    },
  });

  // Update existing parte
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ParteDiario> & { id: string }) => {
      const { data, error } = await supabase
        .from('partes_diarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      toast.success('Parte diario actualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating parte:', error);
      toast.error('Error al actualizar el parte diario');
    },
  });

  // Delete parte
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partes_diarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      toast.success('Parte diario eliminado');
    },
    onError: (error: Error) => {
      console.error('Error deleting parte:', error);
      toast.error('Error al eliminar el parte diario');
    },
  });

  return {
    partes,
    isLoading,
    error,
    createParte: createMutation.mutateAsync,
    updateParte: updateMutation.mutateAsync,
    deleteParte: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
