import { DocumentRecord } from "@/types/database";

export type DocumentStatus = "expired" | "critical" | "upcoming" | "safe";

const DAY_MS = 86_400_000;

export function getDocumentStatus(expiryDate: string, today = new Date()): DocumentStatus {
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);
  const days = Math.ceil((expiry.getTime() - current.getTime()) / DAY_MS);

  if (days < 0) return "expired";
  if (days < 7) return "critical";
  if (days < 30) return "upcoming";
  return "safe";
}

export function daysUntilExpiry(expiryDate: string, today = new Date()): number {
  const expiry = new Date(`${expiryDate}T00:00:00`);
  const current = new Date(today);
  current.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - current.getTime()) / DAY_MS);
}

export function formatExpiryDate(expiryDate: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${expiryDate}T00:00:00`));
}

export const demoDocuments: DocumentRecord[] = [
  { id: "doc-1", title: "General Liability Insurance", category: "Insurance", department: "Operations", owner_id: "demo-user", file_path: "operations/liability.pdf", expiry_date: "2026-12-02", reminder_days_before: 7, last_notified_at: null, created_at: "2026-01-15T08:00:00Z" },
  { id: "doc-2", title: "HRMS Software Licence", category: "Licence", department: "IT", owner_id: "demo-user", file_path: "it/hrms-licence.pdf", expiry_date: "2026-12-18", reminder_days_before: 7, last_notified_at: null, created_at: "2026-02-10T08:00:00Z" },
  { id: "doc-3", title: "Office Printer Warranty", category: "Warranty", department: "Finance", owner_id: "demo-user", file_path: "finance/printer-warranty.pdf", expiry_date: "2027-02-28", reminder_days_before: 7, last_notified_at: null, created_at: "2026-03-04T08:00:00Z" },
  { id: "doc-4", title: "Vendor Service Contract", category: "Contract", department: "Operations", owner_id: "demo-user", file_path: "operations/vendor-contract.pdf", expiry_date: "2026-11-20", reminder_days_before: 7, last_notified_at: null, created_at: "2026-01-08T08:00:00Z" },
];
