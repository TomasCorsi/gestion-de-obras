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

  const userId = user?.id ?? null;
  const legajo = user?.user_metadata?.legajo ? String(user.user_metadata.legajo).trim() : null;

  useEffect(() => {
    if (!userId) {
      setEmpleado(null);
      setLoading(false);
      return;
    }

    const fetchAndLinkEmpleado = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First try to find by user_id (already linked)
        let { data, error: fetchError } = await supabase
          .from('personal')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching empleado profile:', fetchError);
          setError('Error al cargar perfil de empleado');
          setLoading(false);
          return;
        }

        // If not found by user_id, try to auto-link using legajo from user metadata
        if (!data) {
          if (legajo) {
            console.log('Attempting auto-link for legajo:', legajo, 'user_id:', user.id);
            
            // Use secure RPC function to link
            const { data: linkResult, error: linkError } = await supabase
              .rpc('link_personal_to_user', {
                p_legajo: String(legajo).trim(),
                p_user_id: userId
              });

            console.log('Link result:', linkResult, 'Error:', linkError);

            if (!linkError && linkResult && linkResult.length > 0 && linkResult[0].success) {
              console.log('Successfully auto-linked personal record via RPC');
              
              // Refetch the linked record
              const { data: linkedData } = await supabase
                .from('personal')
                .select('*')
                 .eq('user_id', userId)
                .maybeSingle();
              
              data = linkedData;
            } else if (linkError) {
              console.error('Failed to auto-link personal record:', linkError);
            } else if (linkResult?.[0]?.error_message) {
              console.log('Auto-link not possible:', linkResult[0].error_message);
            }
          } else {
            console.log('No legajo found in user metadata:', user.user_metadata);
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
      } catch (err) {
        console.error('Error in fetchAndLinkEmpleado:', err);
        setError('Error al cargar perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchAndLinkEmpleado();
  }, [userId, legajo]);

  const rolPersonal: RolPersonal | null = empleado?.rol || null;

  // Un empleado de campo es cualquier usuario que NO es admin
  // Se usa para restringir el acceso solo a Parte Diario
  const isFieldEmployee = empleado !== null;

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
