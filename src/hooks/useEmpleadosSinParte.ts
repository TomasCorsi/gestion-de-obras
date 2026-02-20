import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RolPersonal = Database["public"]["Enums"]["rol_personal"];

export interface EmpleadoSinParte {
  id: string;
  nombre: string | null;
  apellido: string | null;
  legajo: string | null;
  rol: RolPersonal;
  tieneUsuario: boolean;
}

interface UseEmpleadosSinParteResult {
  empleadosSinParte: EmpleadoSinParte[];
  totalActivos: number;
  isLoading: boolean;
  error: Error | null;
}

export function useEmpleadosSinParte(fecha: string): UseEmpleadosSinParteResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["empleados-sin-parte", fecha],
    queryFn: async () => {
      // 1. Get all active employees
      const { data: empleadosActivos, error: errorEmpleados } = await supabase
        .from("personal_selector" as any)
        .select("id, nombre, apellido, legajo, rol, user_id")
        .eq("activo", true)
        .order("apellido") as { data: { id: string; nombre: string | null; apellido: string | null; legajo: string | null; rol: RolPersonal; user_id: string | null }[] | null; error: any };

      if (errorEmpleados) throw errorEmpleados;

      // Filter out roles that don't need to submit partes
      const ROLES_EXCLUIDOS = ['administrativo', 'sereno', 'topografo'];
      const empleadosRelevantes = (empleadosActivos || [])
        .filter((emp) => !ROLES_EXCLUIDOS.includes(emp.rol));

      // 2. Get all partes_diarios for the given date
      const { data: partesDelDia, error: errorPartes } = await supabase
        .from("partes_diarios")
        .select("personal_id")
        .eq("fecha", fecha);

      if (errorPartes) throw errorPartes;

      // 3. Create a set of personal_ids that have submitted a parte
      const conParte = new Set(partesDelDia?.map((p) => p.personal_id) || []);

      // 4. Filter employees that don't have a parte for this date
      const sinParte: EmpleadoSinParte[] = empleadosRelevantes
        .filter((emp) => !conParte.has(emp.id))
        .map((emp) => ({
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          legajo: emp.legajo,
          rol: emp.rol,
          tieneUsuario: emp.user_id !== null,
        }));

      return {
        empleadosSinParte: sinParte,
        totalActivos: empleadosRelevantes.length,
      };
    },
    enabled: !!fecha,
  });

  return {
    empleadosSinParte: data?.empleadosSinParte || [],
    totalActivos: data?.totalActivos || 0,
    isLoading,
    error: error as Error | null,
  };
}
