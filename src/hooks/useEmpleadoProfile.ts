import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PersonalRow = Database['public']['Tables']['personal']['Row'];
type RolPersonal = Database['public']['Enums']['rol_personal'];

interface EmpleadoProfile extends PersonalRow {
  nombreCompleto: string;
}

export function useEmpleadoProfile() {
  const { user } = useAuth();
  const [empleado, setEmpleado] = useState<EmpleadoProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setEmpleado(null);
      setLoading(false);
      return;
    }

    const fetchAndLinkEmpleado = async () => {
      setLoading(true);
      setError(null);
      
      // First try to find by user_id (already linked)
      let { data, error: fetchError } = await supabase
        .from('personal')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching empleado profile:', fetchError);
        setError('Error al cargar perfil de empleado');
        setLoading(false);
        return;
      }

      // If not found by user_id, try to auto-link using legajo from user metadata
      if (!data) {
        const legajo = user.user_metadata?.legajo;
        
        if (legajo) {
          // Find unlinked personal record with matching legajo
          const { data: unlinkedPersonal } = await supabase
            .from('personal')
            .select('*')
            .eq('legajo', legajo)
            .is('user_id', null)
            .maybeSingle();

          if (unlinkedPersonal) {
            // Try to link it (RLS policy allows this now)
            const { error: linkError } = await supabase
              .from('personal')
              .update({ user_id: user.id })
              .eq('id', unlinkedPersonal.id);

            if (!linkError) {
              console.log('Successfully auto-linked personal record');
              data = { ...unlinkedPersonal, user_id: user.id };
            } else {
              console.error('Failed to auto-link personal record:', linkError);
            }
          }
        }
      }

      if (data) {
        setEmpleado({
          ...data,
          nombreCompleto: `${data.nombre || ''} ${data.apellido || ''}`.trim(),
        });
      } else {
        setEmpleado(null);
      }
      
      setLoading(false);
    };

    fetchAndLinkEmpleado();
  }, [user]);

  const rolPersonal: RolPersonal | null = empleado?.rol || null;

  // Un empleado de campo es aquel que:
  // 1. Tiene registro en la tabla personal (empleado !== null)
  // 2. Su rol NO es "administrativo" (los administrativos tienen acceso completo)
  // Nota: Los capataces se manejan via user_roles, no son empleados de campo
  const isFieldEmployee = empleado !== null && 
    !['administrativo'].includes(empleado.rol);

  return {
    empleado,
    loading,
    error,
    rolPersonal,
    isFieldEmployee, // true si solo debe ver Parte Diario
    isMaquinista: rolPersonal === 'maquinista',
    isChofer: rolPersonal === 'chofer',
    isCapataz: rolPersonal === 'capataz',
    isMecanico: rolPersonal === 'mecanico',
    isSereno: rolPersonal === 'sereno',
    isTopografo: rolPersonal === 'topografo',
    isAyudante: rolPersonal === 'ayudante',
    isAdministrativo: rolPersonal === 'administrativo',
  };
}
