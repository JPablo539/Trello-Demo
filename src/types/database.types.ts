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
      boardProfileRelation: {
        Row: {
          id: string
          created_at: string
          board_id: string | null
          profile_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          board_id?: string | null
          profile_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          board_id?: string | null
          profile_id?: string | null
        }
      }
      boards: {
        Row: {
          id: string
          created_at: string
          board_name: string | null
          profiles_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          board_name?: string | null
          profiles_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          board_name?: string | null
          profiles_id?: string | null
        }
      }
      cards: {
        Row: {
          id: string
          created_at: string
          position: number | null
          list_id: string | null
          content: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          position?: number | null
          list_id?: string | null
          content?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          position?: number | null
          list_id?: string | null
          content?: string | null
        }
      }
      lists: {
        Row: {
          id: string
          created_at: string
          list_name: string | null
          position: number | null
          board_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          list_name?: string | null
          position?: number | null
          board_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          list_name?: string | null
          position?: number | null
          board_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          users_id: string | null
          name: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          users_id?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          users_id?: string | null
          name?: string | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string | null
          auth_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          email?: string | null
          auth_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string | null
          auth_id?: string | null
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
      [_ in never]: never
    }
  }
} 