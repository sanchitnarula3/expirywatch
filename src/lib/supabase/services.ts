import { createClient, isSupabaseConfigured } from "./client";
import {
  DocumentCategory,
  DocumentRecord,
  Profile,
  RenewalLog,
  UserRole,
} from "@/types/database";

/**
 * High-level Supabase Data & Storage Services (Member 2)
 * Provides typed, RLS-enforced database and storage interactions.
 */

// ------------------------------------------------------------------------------
// Authentication & Profile Services
// ------------------------------------------------------------------------------

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, department")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // Fallback if profile trigger hasn't finished or was bypassed
    return {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      email: user.email || "",
      role: (user.user_metadata?.role as UserRole) || "staff",
      department: user.user_metadata?.department || "Operations",
    };
  }

  return profile as Profile;
}

export async function signInWithSupabase(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  fullName: string,
  department: string = "Operations",
  role: UserRole = "staff"
) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        department,
        role,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOutWithSupabase() {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ------------------------------------------------------------------------------
// Cloud Storage Services (Bucket: 'documents')
// ------------------------------------------------------------------------------

export async function uploadDocumentToStorage(
  file: File,
  department: string
): Promise<string> {
  const supabase = createClient();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${department.toLowerCase()}/${Date.now()}_${sanitizedName}`;

  const { error } = await supabase.storage
    .from("documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload document to storage: ${error.message}`);
  }

  return filePath;
}

export async function getDocumentDownloadUrl(filePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600); // 1-hour signed URL

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed download URL: ${error?.message}`);
  }

  return data.signedUrl;
}

// ------------------------------------------------------------------------------
// Database Document Services
// ------------------------------------------------------------------------------

export async function fetchSupabaseDocuments(
  departmentFilter?: string
): Promise<DocumentRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from("documents")
    .select("*")
    .order("expiry_date", { ascending: true });

  if (departmentFilter && departmentFilter !== "all") {
    query = query.eq("department", departmentFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as DocumentRecord[];
}

export async function createSupabaseDocument(params: {
  title: string;
  category: DocumentCategory;
  department: string;
  filePath: string;
  expiryDate: string;
  reminderDaysBefore?: number;
}): Promise<DocumentRecord> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required to create a document.");

  const insertData = {
    title: params.title,
    category: params.category,
    department: params.department,
    file_path: params.filePath,
    expiry_date: params.expiryDate,
    reminder_days_before: params.reminderDaysBefore ?? 7,
    owner_id: user.id,
  };

  const { data, error } = await supabase
    .from("documents")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data as DocumentRecord;
}

// ------------------------------------------------------------------------------
// Document Renewal & Audit Log Services
// ------------------------------------------------------------------------------

export async function renewSupabaseDocument(params: {
  documentId: string;
  newExpiryDate: string;
  notes: string;
}): Promise<{ document: DocumentRecord; log: RenewalLog }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required to renew a document.");

  // 1. Fetch current document to get previous expiry date
  const { data: currentDoc, error: fetchError } = await supabase
    .from("documents")
    .select("expiry_date")
    .eq("id", params.documentId)
    .single();

  if (fetchError || !currentDoc) {
    throw new Error("Target document not found or inaccessible.");
  }

  const previousExpiryDate = currentDoc.expiry_date;

  // 2. Update document expiry date
  const { data: updatedDoc, error: updateError } = await supabase
    .from("documents")
    .update({ expiry_date: params.newExpiryDate })
    .eq("id", params.documentId)
    .select()
    .single();

  if (updateError || !updatedDoc) throw updateError;

  // 3. Insert audit log into renewal_logs
  const { data: log, error: logError } = await supabase
    .from("renewal_logs")
    .insert({
      document_id: params.documentId,
      renewed_by: user.id,
      previous_expiry_date: previousExpiryDate,
      new_expiry_date: params.newExpiryDate,
      notes: params.notes || "",
    })
    .select()
    .single();

  if (logError || !log) throw logError;

  return {
    document: updatedDoc as DocumentRecord,
    log: log as RenewalLog,
  };
}

export async function fetchSupabaseRenewalLogs(): Promise<RenewalLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("renewal_logs")
    .select("*")
    .order("renewed_at", { ascending: false });

  if (error) throw error;
  return (data || []) as RenewalLog[];
}
