import { DocumentRecord, Profile, RenewalLog } from "@/types/database";
import { demoDocuments } from "@/lib/documents";

const DOCUMENTS_KEY = "expirywatch.documents.v1";
const RENEWALS_KEY = "expirywatch.renewals.v1";
const PROFILE_KEY = "expirywatch.profile.v1";

const demoProfile: Profile = {
  id: "demo-user",
  full_name: "Parth Deshmukh",
  email: "parth@example.com",
  role: "admin",
  department: "Operations",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing and quota errors should not break the dashboard.
  }
}

export function loadDocuments(): DocumentRecord[] {
  return read(DOCUMENTS_KEY, demoDocuments);
}

export function saveDocuments(documents: DocumentRecord[]): void {
  write(DOCUMENTS_KEY, documents);
}

export function loadRenewals(): RenewalLog[] {
  return read(RENEWALS_KEY, []);
}

export function saveRenewals(renewals: RenewalLog[]): void {
  write(RENEWALS_KEY, renewals);
}

export function loadProfile(): Profile {
  return read(PROFILE_KEY, demoProfile);
}

export function saveProfile(profile: Profile): void {
  write(PROFILE_KEY, profile);
}

export function clearLocalWorkspace(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DOCUMENTS_KEY);
  window.localStorage.removeItem(RENEWALS_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
}
