export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string | null
          razon_social: string | null
          nombre_establecimiento: string | null
          tipo_establecimiento: string | null
          cuit: string | null
          direccion: string | null
          localidad: string | null
          provincia: string | null
          direccion_lat: number | null
          direccion_lng: number | null
          email: string | null
          phone: string | null
          company: string | null
          status: 'active' | 'inactive' | 'lead'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          razon_social?: string | null
          nombre_establecimiento?: string | null
          tipo_establecimiento?: string | null
          cuit?: string | null
          direccion?: string | null
          localidad?: string | null
          provincia?: string | null
          direccion_lat?: number | null
          direccion_lng?: number | null
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: 'active' | 'inactive' | 'lead'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          razon_social?: string | null
          nombre_establecimiento?: string | null
          tipo_establecimiento?: string | null
          cuit?: string | null
          direccion?: string | null
          localidad?: string | null
          provincia?: string | null
          direccion_lat?: number | null
          direccion_lng?: number | null
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: 'active' | 'inactive' | 'lead'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      client_contacts: {
        Row: {
          id: string
          client_id: string
          tipo_contacto: string
          email: string | null
          telefono: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          tipo_contacto: string
          email?: string | null
          telefono?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          tipo_contacto?: string
          email?: string | null
          telefono?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          client_id: string
          user_id: string
          title: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          user_id: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          user_id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'user'
      client_status: 'active' | 'inactive' | 'lead'
    }
  }
}

