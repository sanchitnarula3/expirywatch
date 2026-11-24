"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { daysUntilExpiry, DocumentStatus, formatExpiryDate, getDocumentStatus } from "@/lib/documents";
import { loadDocuments, loadProfile, loadRenewals, saveDocuments, saveRenewals } from "@/lib/local-store";
import { hasLocalSession, signOutLocally } from "@/lib/local-auth";
import { DocumentRecord, Profile, RenewalLog } from "@/types/database";
import { RenewalModal } from "@/components/RenewalModal";
import { StatusBadge } from "@/components/StatusBadge";
import { UploadModal } from "@/components/UploadModal";

const statusOrder: DocumentStatus[] = ["expired", "critical", "upcoming", "safe"];

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [renewals, setRenewals] = useState<RenewalLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | DocumentStatus>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renewing, setRenewing] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    if (!hasLocalSession()) { router.replace("/login"); return; }
    try { setDocuments(loadDocuments()); setRenewals(loadRenewals()); setProfile(loadProfile()); }
    catch { setError("Your local workspace could not be loaded. Refresh to try again."); }
    finally { setHydrated(true); }
  }, [router]);

  const departments = ["all", "HR", "IT", "Finance", "Operations"];
  const scopedDocuments = useMemo(() => documents.filter((doc) => profile?.role === "admin" ? departmentFilter === "all" || doc.department === departmentFilter : doc.department === profile?.department), [documents, departmentFilter, profile]);
  const counts = useMemo(() => statusOrder.reduce((result, status) => ({ ...result, [status]: scopedDocuments.filter((doc) => getDocumentStatus(doc.expiry_date) === status).length }), {} as Record<DocumentStatus, number>), [scopedDocuments]);
  const visible = scopedDocuments.filter((doc) => { const status = getDocumentStatus(doc.expiry_date); return (filter === "all" || status === filter) && `${doc.title} ${doc.department} ${doc.category}`.toLowerCase().includes(query.toLowerCase()); }).sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date));
  const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  function addDocument(document: DocumentRecord) { const next = [...documents, document]; setDocuments(next); saveDocuments(next); setUploadOpen(false); }
  function renew(date: string, notes: string) { if (!renewing || !profile) return; const now = new Date().toISOString(); const nextDocuments = documents.map((doc) => doc.id === renewing.id ? { ...doc, expiry_date: date } : doc); const nextRenewals = [{ id: `renewal-${Date.now()}`, document_id: renewing.id, renewed_by: profile.id, previous_expiry_date: renewing.expiry_date, new_expiry_date: date, notes, renewed_at: now }, ...renewals]; setDocuments(nextDocuments); setRenewals(nextRenewals); saveDocuments(nextDocuments); saveRenewals(nextRenewals); setRenewing(null); }
  function logout() { signOutLocally(); router.replace("/login"); }

  if (!hydrated) return <main className="state-screen"><div className="loading-mark">E</div><p>Loading your local workspace…</p></main>;
  if (!profile) return <main className="state-screen"><strong>Workspace unavailable</strong><p>{error || "No local profile was found."}</p><a className="button button-primary" href="/login">Return to sign in</a></main>;

  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">E</span><span>ExpiryWatch</span></div><nav><a className="nav-item active" href="/dashboard"><span>▦</span> Overview</a><a className="nav-item" href="#documents"><span>▤</span> Documents <em>{scopedDocuments.length}</em></a><a className="nav-item" href="#renewals"><span>↻</span> Renewal history</a></nav><div className="sidebar-bottom"><div className="profile"><span className="avatar">PD</span><div><strong>{profile.full_name}</strong><small>{profile.role === "admin" ? "Administrator" : profile.department}</small></div><button className="dots logout-button" onClick={logout} aria-label="Sign out">↪</button></div></div></aside><section className="content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">E</span> ExpiryWatch</div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications">♧</button><span className="top-avatar">PD</span></div></header><div className="page-content"><div className="page-heading"><div><p className="eyebrow">{dateLabel}</p><h1>Good morning, {profile.full_name.split(" ")[0]}.</h1><p className="muted">Here&apos;s what needs your attention today.</p></div><button className="button button-primary" onClick={() => setUploadOpen(true)}><span>＋</span> Add document</button></div>{error && <div className="inline-error" role="alert">{error}</div>}<div className="stat-grid">{statusOrder.map((status) => <button key={status} className={`stat-card ${filter === status ? "selected" : ""}`} onClick={() => setFilter(status)}><span className={`stat-icon stat-${status === "expired" ? "red" : status === "critical" ? "orange" : status === "upcoming" ? "yellow" : "green"}`}>{status === "expired" ? "!" : status === "critical" ? "◷" : status === "upcoming" ? "◌" : "✓"}</span><span><strong>{counts[status]}</strong><small>{status === "expired" ? "Expired" : status === "critical" ? "Critical · less than 7 days" : status === "upcoming" ? "Upcoming · less than 30 days" : "Safe"}</small></span></button>)}</div><section className="document-section" id="documents"><div className="section-heading"><div><h2>All documents</h2><span className="record-count">{visible.length} records</span></div><div className="table-tools"><div className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" aria-label="Search documents" /></div>{profile.role === "admin" && <select className="filter-button department-filter" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label="Filter by department">{departments.map((department) => <option key={department} value={department}>{department === "all" ? "All departments" : department}</option>)}</select>}<button className="filter-button" onClick={() => { setFilter("all"); setDepartmentFilter("all"); }}>Reset</button></div></div><div className="table-wrap"><table><thead><tr><th>Document</th><th>Department</th><th>Expiry date</th><th>Status</th><th aria-label="Actions"></th></tr></thead><tbody>{visible.map((doc) => { const status = getDocumentStatus(doc.expiry_date); const days = daysUntilExpiry(doc.expiry_date); return <tr key={doc.id}><td><strong>{doc.title}</strong><small>{doc.category}</small></td><td>{doc.department}</td><td>{formatExpiryDate(doc.expiry_date)}<small className={status === "expired" ? "text-red" : ""}>{status === "expired" ? `${Math.abs(days)} days overdue` : `${days} days left`}</small></td><td><StatusBadge status={status} /></td><td><button className="row-action" onClick={() => setRenewing(doc)}>Renew</button></td></tr>; })}</tbody></table>{visible.length === 0 && <div className="empty-state"><strong>No documents found</strong><span>Try changing your search or filter.</span></div>}</div></section><section className="renewal-section" id="renewals"><div className="section-heading"><div><h2>Recent renewal history</h2><span className="record-count">{renewals.length} records</span></div></div>{renewals.length === 0 ? <div className="history-empty">Renewed documents will appear here.</div> : <div className="history-list">{renewals.slice(0, 5).map((item) => <div className="history-item" key={item.id}><span className="history-check">✓</span><div><strong>{documents.find((doc) => doc.id === item.document_id)?.title || "Document"}</strong><small>{item.previous_expiry_date} → {item.new_expiry_date}{item.notes ? ` · ${item.notes}` : ""}</small></div></div>)}</div>}</section></div></section>{uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onSubmit={addDocument} />}{renewing && <RenewalModal document={renewing} onClose={() => setRenewing(null)} onSubmit={renew} />}</main>;
}
