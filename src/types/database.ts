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
