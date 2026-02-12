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
      asignaciones_maquinaria_obra: {
        Row: {
          activa: boolean | null
          cantidad: number | null
          costo_hora: number
          created_at: string
          fecha_fin: string | null
          fecha_inicio: string | null
          horas: number | null
          id: string
          maquinaria_id: string | null
          obra_id: string
          observaciones: string | null
          tipo_maquinaria: Database["public"]["Enums"]["tipo_maquinaria"] | null
          updated_at: string
        }
        Insert: {
          activa?: boolean | null
          cantidad?: number | null
          costo_hora?: number
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          horas?: number | null
          id?: string
          maquinaria_id?: string | null
          obra_id: string
          observaciones?: string | null
          tipo_maquinaria?:
            | Database["public"]["Enums"]["tipo_maquinaria"]
            | null
          updated_at?: string
        }
        Update: {
          activa?: boolean | null
          cantidad?: number | null
          costo_hora?: number
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          horas?: number | null
          id?: string
          maquinaria_id?: string | null
          obra_id?: string
          observaciones?: string | null
          tipo_maquinaria?:
            | Database["public"]["Enums"]["tipo_maquinaria"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_maquinaria_obra_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_maquinaria_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_personal_obra: {
        Row: {
          cantidad: number
          costo_total: number | null
          created_at: string
          id: string
          obra_id: string
          observaciones: string | null
          rol: Database["public"]["Enums"]["rol_personal"]
          sueldo_mensual: number
          updated_at: string
        }
        Insert: {
          cantidad?: number
          costo_total?: number | null
          created_at?: string
          id?: string
          obra_id: string
          observaciones?: string | null
          rol: Database["public"]["Enums"]["rol_personal"]
          sueldo_mensual?: number
          updated_at?: string
        }
        Update: {
          cantidad?: number
          costo_total?: number | null
          created_at?: string
          id?: string
          obra_id?: string
          observaciones?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"]
          sueldo_mensual?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_personal_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cargas_combustible: {
        Row: {
          comprobante: string | null
          costo_total: number | null
          created_at: string
          estacion: string | null
          fecha: string | null
          horas_maquina: number | null
          id: string
          litros: number | null
          maquinaria_id: string | null
          obra_id: string | null
          operador: string | null
          precio_litro: number | null
          updated_at: string
        }
        Insert: {
          comprobante?: string | null
          costo_total?: number | null
          created_at?: string
          estacion?: string | null
          fecha?: string | null
          horas_maquina?: number | null
          id?: string
          litros?: number | null
          maquinaria_id?: string | null
          obra_id?: string | null
          operador?: string | null
          precio_litro?: number | null
          updated_at?: string
        }
        Update: {
          comprobante?: string | null
          costo_total?: number | null
          created_at?: string
          estacion?: string | null
          fecha?: string | null
          horas_maquina?: number | null
          id?: string
          litros?: number | null
          maquinaria_id?: string | null
          obra_id?: string | null
          operador?: string | null
          precio_litro?: number | null
          updated_at?: string
        }
        Relationships: [
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
      cargas_combustible_repartidor: {
        Row: {
          created_at: string | null
          fecha: string
          horas: number | null
          id: string
          km: number | null
          litros: number
          maquinaria_id: string | null
          obra_id: string | null
          observaciones: string | null
          operador_id: string | null
          parte_diario_id: string | null
          repartidor_id: string | null
          tipo_operador: string | null
          tipo_producto: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fecha: string
          horas?: number | null
          id?: string
          km?: number | null
          litros?: number
          maquinaria_id?: string | null
          obra_id?: string | null
          observaciones?: string | null
          operador_id?: string | null
          parte_diario_id?: string | null
          repartidor_id?: string | null
          tipo_operador?: string | null
          tipo_producto?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string
          horas?: number | null
          id?: string
          km?: number | null
          litros?: number
          maquinaria_id?: string | null
          obra_id?: string | null
          observaciones?: string | null
          operador_id?: string | null
          parte_diario_id?: string | null
          repartidor_id?: string | null
          tipo_operador?: string | null
          tipo_producto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargas_combustible_repartidor_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_parte_diario_id_fkey"
            columns: ["parte_diario_id"]
            isOneToOne: false
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargas_combustible_repartidor_repartidor_id_fkey"
            columns: ["repartidor_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      certificado_conceptos: {
        Row: {
          activo: boolean
          categoria: string
          created_at: string
          id: string
          nombre: string
          obra_id: string
          orden: number
          precio_unitario: number
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nombre: string
          obra_id: string
          orden?: number
          precio_unitario?: number
          unidad: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nombre?: string
          obra_id?: string
          orden?: number
          precio_unitario?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_conceptos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      certificado_items: {
        Row: {
          cantidad: number
          certificado_id: string
          concepto_id: string | null
          created_at: string
          descripcion: string
          id: string
          precio_unitario: number
          subtotal: number
          unidad: string
        }
        Insert: {
          cantidad?: number
          certificado_id: string
          concepto_id?: string | null
          created_at?: string
          descripcion: string
          id?: string
          precio_unitario?: number
          subtotal?: number
          unidad: string
        }
        Update: {
          cantidad?: number
          certificado_id?: string
          concepto_id?: string | null
          created_at?: string
          descripcion?: string
          id?: string
          precio_unitario?: number
          subtotal?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_items_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificado_items_concepto_id_fkey"
            columns: ["concepto_id"]
            isOneToOne: false
            referencedRelation: "certificado_conceptos"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_certificado"]
          fecha_emision: string | null
          id: string
          iva: number
          numero: string
          obra_id: string
          observaciones: string | null
          periodo: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_certificado"]
          fecha_emision?: string | null
          id?: string
          iva?: number
          numero: string
          obra_id: string
          observaciones?: string | null
          periodo: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_certificado"]
          fecha_emision?: string | null
          id?: string
          iva?: number
          numero?: string
          obra_id?: string
          observaciones?: string | null
          periodo?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_categorias: {
        Row: {
          cotizacion_id: string
          created_at: string | null
          id: string
          nombre: string
          numero: number
          orden: number | null
        }
        Insert: {
          cotizacion_id: string
          created_at?: string | null
          id?: string
          nombre: string
          numero: number
          orden?: number | null
        }
        Update: {
          cotizacion_id?: string
          created_at?: string | null
          id?: string
          nombre?: string
          numero?: number
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_categorias_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_items: {
        Row: {
          altura_promedio: number | null
          cantidad: number
          cantidad_m2: number | null
          cantidad_m3: number | null
          categoria_id: string | null
          cotizacion_id: string
          created_at: string
          descripcion: string
          id: string
          numero: string | null
          precio_unitario: number
          subtotal: number
          total: number | null
          unidad: string
        }
        Insert: {
          altura_promedio?: number | null
          cantidad: number
          cantidad_m2?: number | null
          cantidad_m3?: number | null
          categoria_id?: string | null
          cotizacion_id: string
          created_at?: string
          descripcion: string
          id?: string
          numero?: string | null
          precio_unitario: number
          subtotal: number
          total?: number | null
          unidad: string
        }
        Update: {
          altura_promedio?: number | null
          cantidad?: number
          cantidad_m2?: number | null
          cantidad_m3?: number | null
          categoria_id?: string | null
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          numero?: string | null
          precio_unitario?: number
          subtotal?: number
          total?: number | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_items_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "cotizacion_categorias"
            referencedColumns: ["id"]
          },
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
          created_at: string
          descripcion: string
          estado: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion: string
          fecha_vencimiento: string
          id: string
          iva: number
          notas: string | null
          numero: string
          obra_id: string | null
          responsable: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion: string
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion?: string
          fecha_vencimiento: string
          id?: string
          iva?: number
          notas?: string | null
          numero: string
          obra_id?: string | null
          responsable: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          estado?: Database["public"]["Enums"]["estado_cotizacion"]
          fecha_creacion?: string
          fecha_vencimiento?: string
          id?: string
          iva?: number
          notas?: string | null
          numero?: string
          obra_id?: string | null
          responsable?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
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
          {
            foreignKeyName: "horas_maquina_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_maquina_operador_id_fkey"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
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
          observacion_reporte_id: string | null
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
          observacion_reporte_id?: string | null
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
          observacion_reporte_id?: string | null
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
          {
            foreignKeyName: "mantenimientos_observacion_reporte_id_fkey"
            columns: ["observacion_reporte_id"]
            isOneToOne: false
            referencedRelation: "observaciones_maquina_estado"
            referencedColumns: ["id"]
          },
        ]
      }
      maquinarias: {
        Row: {
          anio: number | null
          codigo: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas: number
          id: string
          marca: string | null
          nombre: string | null
          obra_id: string | null
          operador_asignado_id: string | null
          patente: string | null
          tipo: Database["public"]["Enums"]["tipo_maquinaria"]
          updated_at: string
        }
        Insert: {
          anio?: number | null
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas?: number
          id?: string
          marca?: string | null
          nombre?: string | null
          obra_id?: string | null
          operador_asignado_id?: string | null
          patente?: string | null
          tipo?: Database["public"]["Enums"]["tipo_maquinaria"]
          updated_at?: string
        }
        Update: {
          anio?: number | null
          codigo?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_maquinaria"]
          horas_acumuladas?: number
          id?: string
          marca?: string | null
          nombre?: string | null
          obra_id?: string | null
          operador_asignado_id?: string | null
          patente?: string | null
          tipo?: Database["public"]["Enums"]["tipo_maquinaria"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maquinarias_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinarias_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinarias_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maquinarias_operador_asignado_id_fkey"
            columns: ["operador_asignado_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
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
          {
            foreignKeyName: "movimientos_stock_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_stock_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          responsable_id: string | null
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          responsable_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_obra"]
          fecha_fin_estimada?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          responsable_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      observaciones_maquina_estado: {
        Row: {
          atendida: boolean
          atendida_por: string | null
          created_at: string
          fecha_atencion: string | null
          fecha_reporte: string
          id: string
          maquinaria_id: string | null
          notas_resolucion: string | null
          observacion: string
          parte_diario_id: string
        }
        Insert: {
          atendida?: boolean
          atendida_por?: string | null
          created_at?: string
          fecha_atencion?: string | null
          fecha_reporte: string
          id?: string
          maquinaria_id?: string | null
          notas_resolucion?: string | null
          observacion?: string
          parte_diario_id: string
        }
        Update: {
          atendida?: boolean
          atendida_por?: string | null
          created_at?: string
          fecha_atencion?: string | null
          fecha_reporte?: string
          id?: string
          maquinaria_id?: string | null
          notas_resolucion?: string | null
          observacion?: string
          parte_diario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observaciones_maquina_estado_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observaciones_maquina_estado_parte_diario_id_fkey"
            columns: ["parte_diario_id"]
            isOneToOne: true
            referencedRelation: "partes_diarios"
            referencedColumns: ["id"]
          },
        ]
      }
      otros_gastos: {
        Row: {
          categoria: string
          comprobante: string | null
          created_at: string
          descripcion: string
          fecha: string
          id: string
          monto: number
          obra_id: string | null
          observaciones: string | null
          proveedor: string | null
          updated_at: string
        }
        Insert: {
          categoria: string
          comprobante?: string | null
          created_at?: string
          descripcion: string
          fecha: string
          id?: string
          monto?: number
          obra_id?: string | null
          observaciones?: string | null
          proveedor?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          comprobante?: string | null
          created_at?: string
          descripcion?: string
          fecha?: string
          id?: string
          monto?: number
          obra_id?: string | null
          observaciones?: string | null
          proveedor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "otros_gastos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      partes_diarios: {
        Row: {
          ausencias: string[] | null
          cantidad_movimiento_interno: number | null
          cantidad_viajes: number | null
          check_aceite_hidraulico: boolean | null
          check_aceite_motor: boolean | null
          check_filtro_aire: boolean | null
          check_liquido_refrigerante: boolean | null
          check_uria: boolean | null
          combustible: number | null
          created_at: string | null
          estado: string
          estado_maquina: string | null
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          horometro_fin: number | null
          horometro_inicio: number | null
          id: string
          maquinaria_id: string | null
          novedades: string | null
          obra_id: string | null
          observacion_maquina: string | null
          observaciones_inconvenientes: string | null
          personal_id: string
          tareas: string | null
          updated_at: string | null
        }
        Insert: {
          ausencias?: string[] | null
          cantidad_movimiento_interno?: number | null
          cantidad_viajes?: number | null
          check_aceite_hidraulico?: boolean | null
          check_aceite_motor?: boolean | null
          check_filtro_aire?: boolean | null
          check_liquido_refrigerante?: boolean | null
          check_uria?: boolean | null
          combustible?: number | null
          created_at?: string | null
          estado?: string
          estado_maquina?: string | null
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          horometro_fin?: number | null
          horometro_inicio?: number | null
          id?: string
          maquinaria_id?: string | null
          novedades?: string | null
          obra_id?: string | null
          observacion_maquina?: string | null
          observaciones_inconvenientes?: string | null
          personal_id: string
          tareas?: string | null
          updated_at?: string | null
        }
        Update: {
          ausencias?: string[] | null
          cantidad_movimiento_interno?: number | null
          cantidad_viajes?: number | null
          check_aceite_hidraulico?: boolean | null
          check_aceite_motor?: boolean | null
          check_filtro_aire?: boolean | null
          check_liquido_refrigerante?: boolean | null
          check_uria?: boolean | null
          combustible?: number | null
          created_at?: string | null
          estado?: string
          estado_maquina?: string | null
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          horometro_fin?: number | null
          horometro_inicio?: number | null
          id?: string
          maquinaria_id?: string | null
          novedades?: string | null
          obra_id?: string | null
          observacion_maquina?: string | null
          observaciones_inconvenientes?: string | null
          personal_id?: string
          tareas?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partes_diarios_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partes_diarios_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      personal: {
        Row: {
          activo: boolean
          apellido: string | null
          banco: string | null
          created_at: string
          dni: string | null
          email: string | null
          fecha_ingreso: string | null
          id: string
          legajo: string | null
          licencia: string | null
          modalidad_pago: string | null
          nombre: string | null
          numero_cuenta: string | null
          rol: Database["public"]["Enums"]["rol_personal"]
          situacion_laboral: string | null
          sueldo: number | null
          sueldo_negro: number | null
          telefono: string | null
          updated_at: string
          user_id: string | null
          vencimiento_licencia: string | null
        }
        Insert: {
          activo?: boolean
          apellido?: string | null
          banco?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          id?: string
          legajo?: string | null
          licencia?: string | null
          modalidad_pago?: string | null
          nombre?: string | null
          numero_cuenta?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"]
          situacion_laboral?: string | null
          sueldo?: number | null
          sueldo_negro?: number | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
          vencimiento_licencia?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string | null
          banco?: string | null
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          id?: string
          legajo?: string | null
          licencia?: string | null
          modalidad_pago?: string | null
          nombre?: string | null
          numero_cuenta?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"]
          situacion_laboral?: string | null
          sueldo?: number | null
          sueldo_negro?: number | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
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
            foreignKeyName: "registros_hh_capataz_id_fkey"
            columns: ["capataz_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_capataz_id_fkey"
            columns: ["capataz_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
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
          {
            foreignKeyName: "registros_hh_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_hh_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
      }
      remitos: {
        Row: {
          cantidad: number
          cantidad_viajes: number | null
          created_at: string
          desde: string | null
          evidencia_url: string | null
          fecha: string
          firmado: boolean
          hasta: string | null
          id: string
          maquinaria_id: string | null
          material: string
          numero: string
          obra_id: string
          observaciones: string | null
          patente_tercero: string | null
          precio_total: number | null
          recibido_por: string
          remito_local: string | null
          remito_tercero: string | null
          row_color: string | null
          tipo_material: string | null
          tipo_transporte: string | null
          unidad: string
          updated_at: string
          viaje_id: string | null
        }
        Insert: {
          cantidad: number
          cantidad_viajes?: number | null
          created_at?: string
          desde?: string | null
          evidencia_url?: string | null
          fecha: string
          firmado?: boolean
          hasta?: string | null
          id?: string
          maquinaria_id?: string | null
          material: string
          numero: string
          obra_id: string
          observaciones?: string | null
          patente_tercero?: string | null
          precio_total?: number | null
          recibido_por: string
          remito_local?: string | null
          remito_tercero?: string | null
          row_color?: string | null
          tipo_material?: string | null
          tipo_transporte?: string | null
          unidad: string
          updated_at?: string
          viaje_id?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_viajes?: number | null
          created_at?: string
          desde?: string | null
          evidencia_url?: string | null
          fecha?: string
          firmado?: boolean
          hasta?: string | null
          id?: string
          maquinaria_id?: string | null
          material?: string
          numero?: string
          obra_id?: string
          observaciones?: string | null
          patente_tercero?: string | null
          precio_total?: number | null
          recibido_por?: string
          remito_local?: string | null
          remito_tercero?: string | null
          row_color?: string | null
          tipo_material?: string | null
          tipo_transporte?: string | null
          unidad?: string
          updated_at?: string
          viaje_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remitos_maquinaria_id_fkey"
            columns: ["maquinaria_id"]
            isOneToOne: false
            referencedRelation: "maquinarias"
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
      vacaciones: {
        Row: {
          aprobado_por: string | null
          created_at: string
          dias_totales: number
          fecha_aprobacion: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string
          observaciones: string | null
          pagada: boolean
          personal_id: string
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string
          dias_totales: number
          fecha_aprobacion?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo?: string
          observaciones?: string | null
          pagada?: boolean
          personal_id: string
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string
          dias_totales?: number
          fecha_aprobacion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string
          observaciones?: string | null
          pagada?: boolean
          personal_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacaciones_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_personal_id_fkey"
            columns: ["personal_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "viajes_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "personal_legajo_lookup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_chofer_id_fkey"
            columns: ["chofer_id"]
            isOneToOne: false
            referencedRelation: "personal_selector"
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
      personal_legajo_lookup: {
        Row: {
          id: string | null
          legajo: string | null
          rol: Database["public"]["Enums"]["rol_personal"] | null
          ya_vinculado: boolean | null
        }
        Insert: {
          id?: string | null
          legajo?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          ya_vinculado?: never
        }
        Update: {
          id?: string | null
          legajo?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          ya_vinculado?: never
        }
        Relationships: []
      }
      personal_selector: {
        Row: {
          activo: boolean | null
          apellido: string | null
          id: string | null
          legajo: string | null
          nombre: string | null
          rol: Database["public"]["Enums"]["rol_personal"] | null
          user_id: string | null
        }
        Insert: {
          activo?: boolean | null
          apellido?: string | null
          id?: string | null
          legajo?: string | null
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          user_id?: string | null
        }
        Update: {
          activo?: boolean | null
          apellido?: string | null
          id?: string | null
          legajo?: string | null
          nombre?: string | null
          rol?: Database["public"]["Enums"]["rol_personal"] | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      is_personal_capataz: { Args: { _user_id: string }; Returns: boolean }
      link_personal_to_user: {
        Args: { p_legajo: string; p_user_id: string }
        Returns: {
          error_message: string
          personal_id: string
          rol: Database["public"]["Enums"]["rol_personal"]
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "capataz" | "maquinista" | "ayudante"
      categoria_stock: "material" | "repuesto" | "herramienta" | "consumible"
      estado_certificado: "borrador" | "emitido" | "cobrado"
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
        | "capataz"
        | "maquinista"
        | "chofer"
        | "administrativo"
        | "ayudante"
        | "sereno"
        | "mecanico"
        | "topografo"
        | "repartidor_calecita"
      tipo_mantenimiento: "preventivo" | "correctivo" | "emergencia"
      tipo_maquinaria:
        | "cargadora"
        | "compactador"
        | "retroexcavadora"
        | "minicargadora"
        | "motoniveladora"
        | "topador"
        | "pala_retro"
        | "batea"
        | "acoplado"
        | "camion"
        | "carreton"
        | "cisterna"
        | "tanque_cisterna"
        | "tanque_regador_tractor"
        | "soplador"
        | "zanjeadora"
        | "rastra"
        | "tractor"
        | "rastra_grosspal"
        | "auto"
        | "camioneta"
        | "grupo_electrogeno"
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
      app_role: ["admin", "capataz", "maquinista", "ayudante"],
      categoria_stock: ["material", "repuesto", "herramienta", "consumible"],
      estado_certificado: ["borrador", "emitido", "cobrado"],
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
        "capataz",
        "maquinista",
        "chofer",
        "administrativo",
        "ayudante",
        "sereno",
        "mecanico",
        "topografo",
        "repartidor_calecita",
      ],
      tipo_mantenimiento: ["preventivo", "correctivo", "emergencia"],
      tipo_maquinaria: [
        "cargadora",
        "compactador",
        "retroexcavadora",
        "minicargadora",
        "motoniveladora",
        "topador",
        "pala_retro",
        "batea",
        "acoplado",
        "camion",
        "carreton",
        "cisterna",
        "tanque_cisterna",
        "tanque_regador_tractor",
        "soplador",
        "zanjeadora",
        "rastra",
        "tractor",
        "rastra_grosspal",
        "auto",
        "camioneta",
        "grupo_electrogeno",
      ],
      tipo_movimiento_stock: ["entrada", "salida", "ajuste"],
    },
  },
} as const
