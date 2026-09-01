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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          accion: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          datos_antes: Json | null
          datos_despues: Json | null
          detalle: string | null
          entidad: string
          entidad_id: string | null
          id: string
        }
        Insert: {
          accion: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          detalle?: string | null
          entidad: string
          entidad_id?: string | null
          id?: string
        }
        Update: {
          accion?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          detalle?: string | null
          entidad?: string
          entidad_id?: string | null
          id?: string
        }
        Relationships: []
      }
      equipos: {
        Row: {
          capacidad: string | null
          categoria: string
          created_at: string
          criticidad: string | null
          datos_adicionales: Json
          estado: string | null
          fecha_instalacion: string | null
          id: string
          marca: string | null
          modelo: string | null
          observaciones: string | null
          orden: number
          redundancia: string | null
          tag: string
          ubicacion: string | null
        }
        Insert: {
          capacidad?: string | null
          categoria: string
          created_at?: string
          criticidad?: string | null
          datos_adicionales?: Json
          estado?: string | null
          fecha_instalacion?: string | null
          id: string
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          orden?: number
          redundancia?: string | null
          tag: string
          ubicacion?: string | null
        }
        Update: {
          capacidad?: string | null
          categoria?: string
          created_at?: string
          criticidad?: string | null
          datos_adicionales?: Json
          estado?: string | null
          fecha_instalacion?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          observaciones?: string | null
          orden?: number
          redundancia?: string | null
          tag?: string
          ubicacion?: string | null
        }
        Relationships: []
      }
      equipos_externos: {
        Row: {
          capacidad: string | null
          created_at: string
          created_by: string | null
          id: string
          marca: string | null
          modelo: string | null
          notas: string | null
          serie: string | null
          tag: string
          tipo: string
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          capacidad?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          notas?: string | null
          serie?: string | null
          tag: string
          tipo: string
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          capacidad?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          notas?: string | null
          serie?: string | null
          tag?: string
          tipo?: string
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      evidencias: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          equipo_ref: string | null
          id: string
          inspeccion_id: string | null
          mantenimiento_id: string | null
          orden: number
          param_key: string | null
          scope: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          equipo_ref?: string | null
          id?: string
          inspeccion_id?: string | null
          mantenimiento_id?: string | null
          orden?: number
          param_key?: string | null
          scope: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          equipo_ref?: string | null
          id?: string
          inspeccion_id?: string | null
          mantenimiento_id?: string | null
          orden?: number
          param_key?: string | null
          scope?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidencias_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspecciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidencias_mantenimiento_id_fkey"
            columns: ["mantenimiento_id"]
            isOneToOne: false
            referencedRelation: "mantenimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      inspeccion_items: {
        Row: {
          accion_correctiva: string | null
          created_at: string
          equipo_id: string
          estado: string | null
          excepcion_en: string | null
          excepcion_motivo: string | null
          excepcion_por: string | null
          id: string
          inspeccion_id: string
          na_motivo: string | null
          observaciones: string | null
          punto_id: number
          semaforo: string | null
          semaforo_auto: string | null
          valor: string | null
        }
        Insert: {
          accion_correctiva?: string | null
          created_at?: string
          equipo_id: string
          estado?: string | null
          excepcion_en?: string | null
          excepcion_motivo?: string | null
          excepcion_por?: string | null
          id?: string
          inspeccion_id: string
          na_motivo?: string | null
          observaciones?: string | null
          punto_id: number
          semaforo?: string | null
          semaforo_auto?: string | null
          valor?: string | null
        }
        Update: {
          accion_correctiva?: string | null
          created_at?: string
          equipo_id?: string
          estado?: string | null
          excepcion_en?: string | null
          excepcion_motivo?: string | null
          excepcion_por?: string | null
          id?: string
          inspeccion_id?: string
          na_motivo?: string | null
          observaciones?: string | null
          punto_id?: number
          semaforo?: string | null
          semaforo_auto?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspeccion_items_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_items_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspecciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_items_punto_id_fkey"
            columns: ["punto_id"]
            isOneToOne: false
            referencedRelation: "puntos_inspeccion"
            referencedColumns: ["id"]
          },
        ]
      }
      inspecciones: {
        Row: {
          carga_it: number | null
          cargo: string | null
          condicion_clima: string | null
          created_at: string
          estado: string
          fecha: string
          hr_sala: number | null
          id: string
          presion_diferencial: number | null
          proxima_revision: string | null
          pue: number | null
          semana: number
          standby_equipos: string[]
          standby_observaciones: Json
          supervisor: string | null
          tecnico: string | null
          temp_sala: number | null
          turno: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          carga_it?: number | null
          cargo?: string | null
          condicion_clima?: string | null
          created_at?: string
          estado?: string
          fecha: string
          hr_sala?: number | null
          id?: string
          presion_diferencial?: number | null
          proxima_revision?: string | null
          pue?: number | null
          semana: number
          standby_equipos?: string[]
          standby_observaciones?: Json
          supervisor?: string | null
          tecnico?: string | null
          temp_sala?: number | null
          turno?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          carga_it?: number | null
          cargo?: string | null
          condicion_clima?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          hr_sala?: number | null
          id?: string
          presion_diferencial?: number | null
          proxima_revision?: string | null
          pue?: number | null
          semana?: number
          standby_equipos?: string[]
          standby_observaciones?: Json
          supervisor?: string | null
          tecnico?: string | null
          temp_sala?: number | null
          turno?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      mantenimientos: {
        Row: {
          actividad: string | null
          cargo: string | null
          ciudad: string | null
          created_at: string
          created_by: string | null
          datos: Json
          direccion: string | null
          empresa: string | null
          equipo_externo: Json | null
          equipo_id: string | null
          estado: string
          fecha: string
          id: string
          observaciones: string | null
          proyecto: string | null
          tecnico: string | null
          tipo: string
          updated_at: string
          version: number
        }
        Insert: {
          actividad?: string | null
          cargo?: string | null
          ciudad?: string | null
          created_at?: string
          created_by?: string | null
          datos?: Json
          direccion?: string | null
          empresa?: string | null
          equipo_externo?: Json | null
          equipo_id?: string | null
          estado?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          proyecto?: string | null
          tecnico?: string | null
          tipo: string
          updated_at?: string
          version?: number
        }
        Update: {
          actividad?: string | null
          cargo?: string | null
          ciudad?: string | null
          created_at?: string
          created_by?: string | null
          datos?: Json
          direccion?: string | null
          empresa?: string | null
          equipo_externo?: Json | null
          equipo_id?: string | null
          estado?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          proyecto?: string | null
          tecnico?: string | null
          tipo?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mantenimientos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      plantilla_overrides: {
        Row: {
          clave: string
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          oculto: boolean
          opciones: string[] | null
          orden: number | null
          seccion: string | null
          tipo: string
          unidad: string | null
          updated_at: string
        }
        Insert: {
          clave: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          oculto?: boolean
          opciones?: string[] | null
          orden?: number | null
          seccion?: string | null
          tipo: string
          unidad?: string | null
          updated_at?: string
        }
        Update: {
          clave?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          oculto?: boolean
          opciones?: string[] | null
          orden?: number | null
          seccion?: string | null
          tipo?: string
          unidad?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plantilla_parametros: {
        Row: {
          clave: string
          created_at: string
          created_by: string | null
          id: string
          label: string
          obligatorio: boolean
          opciones: string[] | null
          orden: number
          respuesta_esperada: string | null
          seccion: string
          severidad: string
          tipo: string
          tipo_dato: string
          unidad: string | null
          updated_at: string
        }
        Insert: {
          clave: string
          created_at?: string
          created_by?: string | null
          id?: string
          label: string
          obligatorio?: boolean
          opciones?: string[] | null
          orden?: number
          respuesta_esperada?: string | null
          seccion: string
          severidad?: string
          tipo: string
          tipo_dato?: string
          unidad?: string | null
          updated_at?: string
        }
        Update: {
          clave?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
          obligatorio?: boolean
          opciones?: string[] | null
          orden?: number
          respuesta_esperada?: string | null
          seccion?: string
          severidad?: string
          tipo?: string
          tipo_dato?: string
          unidad?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      puntos_inspeccion: {
        Row: {
          descripcion: string
          equipo_id: string
          etiquetas_valores: string[] | null
          id: number
          max_alerta: number | null
          max_ok: number | null
          min_alerta: number | null
          min_ok: number | null
          numero: number
          obligatorio: boolean
          respuesta_esperada: string | null
          severidad: string
          tipo: string
          unidad: string | null
          valores_count: number
        }
        Insert: {
          descripcion: string
          equipo_id: string
          etiquetas_valores?: string[] | null
          id?: number
          max_alerta?: number | null
          max_ok?: number | null
          min_alerta?: number | null
          min_ok?: number | null
          numero: number
          obligatorio?: boolean
          respuesta_esperada?: string | null
          severidad?: string
          tipo?: string
          unidad?: string | null
          valores_count?: number
        }
        Update: {
          descripcion?: string
          equipo_id?: string
          etiquetas_valores?: string[] | null
          id?: number
          max_alerta?: number | null
          max_ok?: number | null
          min_alerta?: number | null
          min_ok?: number | null
          numero?: number
          obligatorio?: boolean
          respuesta_esperada?: string | null
          severidad?: string
          tipo?: string
          unidad?: string | null
          valores_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "puntos_inspeccion_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_inspeccion: {
        Args: { _inspeccion_id: string }
        Returns: boolean
      }
      can_write_inspeccion: {
        Args: { _inspeccion_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _accion: string
          _datos_antes?: Json
          _datos_despues?: Json
          _detalle?: string
          _entidad: string
          _entidad_id: string
        }
        Returns: undefined
      }
      user_owns_evidencia_parent: {
        Args: { _inspeccion_id: string; _mantenimiento_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "tecnico" | "viewer"
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
      app_role: ["admin", "tecnico", "viewer"],
    },
  },
} as const
