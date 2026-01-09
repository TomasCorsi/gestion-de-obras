export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cargas_combustible: {
        Row: {
          cliente_id: string
          comprobante: string | null
          costo_total: number
          created_at: string
          estacion: string
          fecha: string
          horas_maquina: number
          id: string
          litros: number
          maquinaria_id: string
          obra_id: string
          operador: string
          precio_litro: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          comprobante?: string | null
          costo_total: number
          created_at?: string
          estacion: string
          fecha: string
          horas_maquina: number
          id?: string
          litros: number
          maquinaria_id: string
          obra_id: string
          operador: string
          precio_litro: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          comprobante?: string | null
          costo_total?: number
          created_at?: string
          estacion?: string
          fecha?: string
          horas_maquina?: number
          id?: string
          litros?: number
          maquinaria_id?: string
          obra_id?: string
          operador?: string
          precio_litro?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargas_combustible_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean
          contacto_principal: string
          created_at: string
          cuit: string
          direccion: string
          email: string
          id: string
          localidad: string
          nombre: string
          notas: string | null
          provincia: string
          razon_social: string | null
          telefono: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          contacto_principal: string
          created_at?: string
          cuit: string
          direccion: string
          email: string
          id?: string
          localidad: string
          nombre: string
          notas?: string | null
          provincia: string
          razon_social?: string | null
          telefono: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          contacto_principal?: string
          created_at?: string
          cuit?: string
          direccion?: string
          email?: string
          id?: string
          localidad?: string
          nombre?: string
          notas?: string | null
          provincia?: string
          razon_social?: string | null
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      cotizacion_items: {
        Row: {
          cantidad: number
          cotizacion_id: string
          created_at: string
          descripcion: string
          id: string
          precio_unitario: number
          subtotal: number
          unidad: string
        }
        Insert: {
          cantidad: number
          cotizacion_id: string
          created_at?: string
          descripcion: string
          id?: string
          precio_unitario: number
          subtotal: number
          unidad: string
        }
        Update: {
          cantidad?: number
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          precio_unitario?: number
          subtotal?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          cliente_id: string
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion: string
          fecha_vencimiento: string
          id: string
          iva: number
          notas: string | null
          numero: string
          responsable: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion?: string
          fecha_vencimiento: string
          id?: string
          iva?: number
          notas?: string | null
          numero: string
          responsable: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion?: string
          fecha_vencimiento?: string
          id?: string
          iva?: number
          notas?: string | null
          numero?: string
          responsable?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      horas_maquina: {
        Row: {
          created_at: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas_trabajadas: number
          id: string
          maquinaria_id: string
          obra_id: string
          observaciones: string | null
          operador_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha: string
          hora_fin: string
          hora_inicio: string
          horas_trabajadas: number
          id?: string
          maquinaria_id: string
          obra_id: string
          observaciones?: string | null
          operador_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          horas_trabajadas?: number
          id?: string
          maquinaria_id?: string
          obra_id?: string
          observaciones?: string | null
          operador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horas_maquina_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_maquina_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_maquina_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      mantenimientos: {
        Row: {
          costo_mano_obra: number
          costo_repuestos: number
          costo_total: number
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_mantenimiento"]
          fecha: string
          horas_maquina: number
          id: string
          maquinaria_id: string
          observaciones: string | null
          proximo_mantenimiento: string | null
          repuestos: string | null
          tecnico: string
          tipo: Database["public"]["Enums"]["tipo_mantenimiento"]
          updated_at: string
        }
        Insert: {
          costo_mano_obra?: number
          costo_repuestos?: number
          costo_total?: number
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_mantenimiento"]
          fecha: string
          horas_maquina: number
          id?: string
          maquinaria_id: string
          observaciones?: string | null
          proximo_mantenimiento?: string | null
          repuestos?: string | null
          tecnico: string
          tipo: Database["public"]["Enums"]["tipo_mantenimiento"]
          updated_at?: string
        }
        Update: {
          costo_mano_obra?: number
          costo_repuestos?: number
          costo_total?: number
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_mantenimiento"]
          fecha?: string
          horas_maquina?: number
          id?: string
          maquinaria_id?: string
          observaciones?: string | null
          proximo_mantenimiento?: string | null
          repuestos?: string | null
          tecnico?: string
          tipo?: Database["public"]["Enums"]["tipo_mantenimiento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinarias: {
        Row: {
          anio: number
          codigo: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas: number
          id: string
          marca: string
          modelo: string
          nombre: string
          operador_asignado_id: string | null
          patente: string | null
          proximo_service: number
          tipo: Database["public"]["Enums"]["tipo_maquinaria"]
          ubicacion_actual: string
          updated_at: string
        }
        Insert: {
          anio: number
          codigo: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas?: number
          id?: string
          marca: string
          modelo: string
          nombre: string
          operador_asignado_id?: string | null
          patente?: string | null
          proximo_service: number
          tipo: Database["public"]["Enums"]["tipo_maquinaria"]
          ubicacion_actual: string
          updated_at?: string
        }
        Update: {
          anio?: number
          codigo?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas?: number
          id?: string
          marca?: string
          modelo?: string
          nombre?: string
          operador_asignado_id?: string | null
          patente?: string | null
          proximo_service?: number
          tipo?: Database["public"]["Enums"]["tipo_maquinaria"]
          ubicacion_actual?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maquinarias_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          comprobante: string | null
          created_at: string
          fecha: string
          id: string
          item_id: string
          motivo: string
          obra_id: string | null
          observaciones: string | null
          responsable_id: string
          stock_anterior: number
          stock_nuevo: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Insert: {
          cantidad: number
          comprobante?: string | null
          created_at?: string
          fecha: string
          id?: string
          item_id: string
          motivo: string
          obra_id?: string | null
          observaciones?: string | null
          responsable_id: string
          stock_anterior: number
          stock_nuevo: number
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Update: {
          cantidad?: number
          comprobante?: string | null
          created_at?: string
          fecha?: string
          id?: string
          item_id?: string
          motivo?: string
          obra_id?: string | null
          observaciones?: string | null
          responsable_id?: string
          stock_anterior?: number
          stock_nuevo?: number
          tipo?: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada: string | null
          fecha_fin_real: string | null
          fecha_inicio: string
          id: string
          nombre: string
          presupuesto: number | null
          progreso: number
          responsable_id: string | null
          ubicacion: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          codigo: string
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio: string
          id?: string
          nombre: string
          presupuesto?: number | null
          progreso?: number
          responsable_id?: string | null
          ubicacion: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio?: string
          id?: string
          nombre?: string
          presupuesto?: number | null
          progreso?: number
          responsable_id?: string | null
          ubicacion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          dni: string
          email: string | null
          fecha_ingreso: string
          id: string
          licencia: string | null
          nombre: string
          rol: Database["public"]["Enums"]["rol_personal"]
          telefono: string
          updated_at: string
          vencimiento_licencia: string | null
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          dni: string
          email?: string | null
          fecha_ingreso: string
          id?: string
          licencia?: string | null
          nombre: string
          rol: Database["public"]["Enums"]["rol_personal"]
          telefono: string
          updated_at?: string
          vencimiento_licencia?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          dni?: string
          email?: string | null
          fecha_ingreso?: string
          id?: string
          licencia?: string | null
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_personal"]
          telefono?: string
          updated_at?: string
          vencimiento_licencia?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nombre_completo: string
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre_completo: string
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nombre_completo?: string
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registros_hh: {
        Row: {
          capataz_id: string
          cliente_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_presentismo"]
          fecha: string
          hora_entrada: string
          hora_salida: string
          horas_extra: number
          horas_normales: number
          horas_totales: number
          id: string
          obra_id: string
          observaciones: string | null
          persona_id: string
          tarea: string
          updated_at: string
        }
        Insert: {
          capataz_id: string
          cliente_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_presentismo"]
          fecha: string
          hora_entrada: string
          hora_salida: string
          horas_extra?: number
          horas_normales?: number
          horas_totales?: number
          id?: string
          obra_id: string
          observaciones?: string | null
          persona_id: string
          tarea: string
          updated_at?: string
        }
        Update: {
          capataz_id?: string
          cliente_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_presentismo"]
          fecha?: string
          hora_entrada?: string
          hora_salida?: string
          horas_extra?: number
          horas_normales?: number
          horas_totales?: number
          id?: string
          obra_id?: string
          observaciones?: string | null
          persona_id?: string
          tarea?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_hh_capataz_id_fkey"
            columns: ["capataz_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
        ]
      }
      remitos: {
        Row: {
          cantidad: number
          cliente_id: string
          created_at: string
          evidencia_url: string | null
          fecha: string
          firmado: boolean
          id: string
          material: string
          numero: string
          obra_id: string
          observaciones: string | null
          recibido_por: string
          unidad: string
          updated_at: string
          viaje_id: string | null
        }
        Insert: {
          cantidad: number
          cliente_id: string
          created_at?: string
          evidencia_url?: string | null
          fecha: string
          firmado?: boolean
          id?: string
          material: string
          numero: string
          obra_id: string
          observaciones?: string | null
          recibido_por: string
          unidad: string
          updated_at?: string
          viaje_id?: string | null
        }
        Update: {
          cantidad?: number
          cliente_id?: string
          created_at?: string
          evidencia_url?: string | null
          fecha?: string
          firmado?: boolean
          id?: string
          material?: string
          numero?: string
          obra_id?: string
          observaciones?: string | null
          recibido_por?: string
          unidad?: string
          updated_at?: string
          viaje_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remitos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remitos_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          activo: boolean
          categoria: Database["public"]["Enums"]["categoria_stock"]
          codigo: string
          created_at: string
          id: string
          nombre: string
          precio_unitario: number
          stock_actual: number
          stock_maximo: number | null
          stock_minimo: number
          ubicacion: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria: Database["public"]["Enums"]["categoria_stock"]
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          precio_unitario: number
          stock_actual?: number
          stock_maximo?: number | null
          stock_minimo: number
          ubicacion: string
          unidad: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: Database["public"]["Enums"]["categoria_stock"]
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          precio_unitario?: number
          stock_actual?: number
          stock_maximo?: number | null
          stock_minimo?: number
          ubicacion?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viajes: {
        Row: {
          camion_id: string
          chofer_id: string
          created_at: string
          destino: string
          estado: Database["public"]["Enums"]["estado_viaje"]
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          km_recorridos: number | null
          material: string
          obra_id: string
          observaciones: string | null
          origen: string
          updated_at: string
          volumen: number
        }
        Insert: {
          camion_id: string
          chofer_id: string
          created_at?: string
          destino: string
          estado?: Database["public"]["Enums"]["estado_viaje"]
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          km_recorridos?: number | null
          material: string
          obra_id: string
          observaciones?: string | null
          origen: string
          updated_at?: string
          volumen: number
        }
        Update: {
          camion_id?: string
          chofer_id?: string
          created_at?: string
          destino?: string
          estado?: Database["public"]["Enums"]["estado_viaje"]
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          km_recorridos?: number | null
          material?: string
          obra_id?: string
          observaciones?: string | null
          origen?: string
          updated_at?: string
          volumen?: number
        }
        Relationships: [
          {
            foreignKeyName: "viajes_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "capataz" | "maquinista"
      categoria_stock: "material" | "repuesto" | "herramienta" | "consumible"
      estado_cotizacion:
        | "borrador"
        | "enviada"
        | "aprobada"
        | "rechazada"
        | "vencida"
      estado_mantenimiento: "programado" | "en_proceso" | "completado"
      estado_maquinaria: "operativa" | "mantenimiento" | "inactiva" | "en_uso"
      estado_obra: "activa" | "pendiente" | "finalizada" | "pausada"
      estado_presentismo:
        | "presente"
        | "ausente"
        | "licencia"
        | "vacaciones"
        | "enfermedad"
      estado_viaje: "programado" | "en_curso" | "completado" | "cancelado"
      rol_personal:
        | "administrador"
        | "supervisor"
        | "capataz"
        | "maquinista"
        | "chofer"
        | "administrativo"
        | "auditor"
      tipo_mantenimiento: "preventivo" | "correctivo" | "emergencia"
      tipo_maquinaria:
        | "excavadora"
        | "cargadora"
        | "camion_articulado"
        | "topadora"
        | "rodillo"
        | "retroexcavadora"
        | "motoniveladora"
      tipo_movimiento_stock: "entrada" | "salida" | "ajuste"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "capataz", "maquinista"],
      categoria_stock: ["material", "repuesto", "herramienta", "consumible"],
      estado_cotizacion: [
        "borrador",
        "enviada",
        "aprobada",
        "rechazada",
        "vencida",
      ],
      estado_mantenimiento: ["programado", "en_proceso", "completado"],
      estado_maquinaria: ["operativa", "mantenimiento", "inactiva", "en_uso"],
      estado_obra: ["activa", "pendiente", "finalizada", "pausada"],
      estado_presentismo: [
        "presente",
        "ausente",
        "licencia",
        "vacaciones",
        "enfermedad",
      ],
      estado_viaje: ["programado", "en_curso", "completado", "cancelado"],
      rol_personal: [
        "administrador",
        "supervisor",
        "capataz",
        "maquinista",
        "chofer",
        "administrativo",
        "auditor",
      ],
      tipo_mantenimiento: ["preventivo", "correctivo", "emergencia"],
      tipo_maquinaria: [
        "excavadora",
        "cargadora",
        "camion_articulado",
        "topadora",
        "rodillo",
        "retroexcavadora",
        "motoniveladora",
      ],
      tipo_movimiento_stock: ["entrada", "salida", "ajuste"],
    },
  },
} as const
