import { DocumentStatus } from "@/lib/documents";

const labels: Record<DocumentStatus, string> = {
  expired: "Expired",
  critical: "Critical · < 7 days",
  upcoming: "Upcoming · < 30 days",
  safe: "Safe",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>;
}
