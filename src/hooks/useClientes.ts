import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClienteDB {
  id: string;
  nombre: string;
  razon_social: string | null;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  localidad: string;
  provincia: string;
  contacto_principal: string;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClienteForm {
  nombre: string;
  razon_social?: string;
  cuit: string;
  email: string;
  telefono: string;
  direccion: string;
  localidad: string;
  provincia: string;
  contacto_principal: string;
  notas?: string;
  activo: boolean;
}

export function useClientes() {
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre");

    if (error) {
      console.error("Error fetching clientes:", error);
      toast.error("Error al cargar clientes");
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const createCliente = async (cliente: ClienteForm) => {
    const { data, error } = await supabase
      .from("clientes")
      .insert([cliente])
      .select()
      .single();

    if (error) {
      console.error("Error creating cliente:", error);
      toast.error("Error al crear cliente");
      return null;
    }

    toast.success("Cliente creado correctamente");
    await fetchClientes();
    return data;
  };

  const updateCliente = async (id: string, cliente: Partial<ClienteForm>) => {
    const { error } = await supabase
      .from("clientes")
      .update(cliente)
      .eq("id", id);

    if (error) {
      console.error("Error updating cliente:", error);
      toast.error("Error al actualizar cliente");
      return false;
    }

    toast.success("Cliente actualizado correctamente");
    await fetchClientes();
    return true;
  };

  const deleteCliente = async (id: string) => {
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting cliente:", error);
      toast.error("Error al eliminar cliente");
      return false;
    }

    toast.success("Cliente eliminado correctamente");
    await fetchClientes();
    return true;
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return {
    clientes,
    loading,
    fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
  };
}
