export type UserRole = "admin" | "dept_head" | "staff";

export type DocumentCategory =
  | "Insurance"
  | "Warranty"
  | "Licence"
  | "Contract"
  | "Certificate";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  category: DocumentCategory;
  department: string;
  owner_id: string;
  file_path: string;
  expiry_date: string;
  reminder_days_before: number;
  last_notified_at: string | null;
  created_at: string;
}

export interface RenewalLog {
  id: string;
  document_id: string;
  renewed_by: string;
  previous_expiry_date: string;
  new_expiry_date: string;
  notes: string;
  renewed_at: string;
}

/**
 * Full Supabase Database Schema Definition
 * Type-safe interface for @supabase/supabase-js and @supabase/ssr
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          department: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role?: UserRole;
          department?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role?: UserRole;
          department?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          title: string;
          category: DocumentCategory;
          department: string;
          owner_id: string;
          file_path: string;
          expiry_date: string;
          reminder_days_before: number;
          last_notified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category: DocumentCategory;
          department: string;
          owner_id: string;
          file_path: string;
          expiry_date: string;
          reminder_days_before?: number;
          last_notified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: DocumentCategory;
          department?: string;
          owner_id?: string;
          file_path?: string;
          expiry_date?: string;
          reminder_days_before?: number;
          last_notified_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      renewal_logs: {
        Row: {
          id: string;
          document_id: string;
          renewed_by: string;
          previous_expiry_date: string;
          new_expiry_date: string;
          notes: string;
          renewed_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          renewed_by: string;
          previous_expiry_date: string;
          new_expiry_date: string;
          notes?: string;
          renewed_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          renewed_by?: string;
          previous_expiry_date?: string;
          new_expiry_date?: string;
          notes?: string;
          renewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "renewal_logs_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "renewal_logs_renewed_by_fkey";
            columns: ["renewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      expiry_reminder_deliveries: {
        Row: {
          document_id: string;
          expiry_date: string;
          milestone: number;
          claimed_at: string;
          sent_at: string | null;
        };
        Insert: {
          document_id: string;
          expiry_date: string;
          milestone: number;
          claimed_at?: string;
          sent_at?: string | null;
        };
        Update: {
          document_id?: string;
          expiry_date?: string;
          milestone?: number;
          claimed_at?: string;
          sent_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_document_uploaders: {
        Args: Record<PropertyKey, never>;
        Returns: { document_id: string; uploader_name: string }[];
      };
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_current_user_department: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      document_category: DocumentCategory;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
