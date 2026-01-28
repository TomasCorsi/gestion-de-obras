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

    const fetchEmpleado = async () => {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
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

    fetchEmpleado();
  }, [user]);

  const rolPersonal: RolPersonal | null = empleado?.rol || null;

  return {
    empleado,
    loading,
    error,
    rolPersonal,
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
