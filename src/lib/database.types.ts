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
      star_citizen_systems: {
        Row: {
          id: string
          name: string
          code: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          is_active?: boolean
          created_at?: string
        }
      }
      service_types: {
        Row: {
          id: string
          name: string
          description: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          is_active?: boolean
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          discord_id: string
          discord_username: string
          discord_avatar: string | null
          role: string
          is_active: boolean
          created_at: string
          last_login: string
        }
        Insert: {
          id?: string
          discord_id: string
          discord_username: string
          discord_avatar?: string | null
          role?: string
          is_active?: boolean
          created_at?: string
          last_login?: string
        }
        Update: {
          id?: string
          discord_id?: string
          discord_username?: string
          discord_avatar?: string | null
          role?: string
          is_active?: boolean
          created_at?: string
          last_login?: string
        }
      }
      service_requests: {
        Row: {
          id: string
          service_type_id: string
          system_id: string
          client_name: string
          client_discord: string
          location_details: string
          description: string
          status: string
          priority: string
          assigned_to: string | null
          tracking_code: string
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          service_type_id: string
          system_id: string
          client_name: string
          client_discord: string
          location_details: string
          description?: string
          status?: string
          priority?: string
          assigned_to?: string | null
          tracking_code?: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          service_type_id?: string
          system_id?: string
          client_name?: string
          client_discord?: string
          location_details?: string
          description?: string
          status?: string
          priority?: string
          assigned_to?: string | null
          tracking_code?: string
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      request_notes: {
        Row: {
          id: string
          request_id: string
          user_id: string
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          user_id: string
          note: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          user_id?: string
          note?: string
          created_at?: string
        }
      }
      request_messages: {
        Row: {
          id: string
          request_id: string
          sender_type: 'client' | 'dispatcher'
          sender_name: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          request_id: string
          sender_type: 'client' | 'dispatcher'
          sender_name: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          sender_type?: 'client' | 'dispatcher'
          sender_name?: string
          message?: string
          created_at?: string
        }
      }
      crew_status: {
        Row: {
          id: string
          user_id: string
          ship_name: string
          current_system_id: string | null
          is_active: boolean
          has_tier1_beds: boolean
          has_tier2_beds: boolean
          has_tier3_beds: boolean
          has_quantum_fuel: boolean
          has_hydrogen_fuel: boolean
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ship_name?: string
          current_system_id?: string | null
          is_active?: boolean
          has_tier1_beds?: boolean
          has_tier2_beds?: boolean
          has_tier3_beds?: boolean
          has_quantum_fuel?: boolean
          has_hydrogen_fuel?: boolean
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ship_name?: string
          current_system_id?: string | null
          is_active?: boolean
          has_tier1_beds?: boolean
          has_tier2_beds?: boolean
          has_tier3_beds?: boolean
          has_quantum_fuel?: boolean
          has_hydrogen_fuel?: boolean
          notes?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
