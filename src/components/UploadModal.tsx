"use client";

import { FormEvent, useState } from "react";
import { DocumentCategory, DocumentRecord } from "@/types/database";

const categories: DocumentCategory[] = ["Insurance", "Warranty", "Licence", "Contract", "Certificate"];

export function UploadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (document: DocumentRecord) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("Insurance");
  const [department, setDepartment] = useState("Operations");
  const [expiryDate, setExpiryDate] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [fileError, setFileError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !expiryDate) return;
    onSubmit({ id: `doc-${Date.now()}`, title: title.trim(), category, department, owner_id: "demo-user", file_path: fileName || "pending-upload", expiry_date: expiryDate, reminder_days_before: 7, last_notified_at: null, created_at: new Date().toISOString() });
  }

  function selectFile(file: File | undefined) {
    setFileError("");
    setFileDetails(null);
    setFileName("");
    if (!file) return;
    const validType = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!validType) { setFileError("Choose a PDF or image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError("Files must be 10 MB or smaller."); return; }
    setFileName(file.name);
    setFileDetails({ name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB` });
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit} aria-labelledby="upload-title">
      <div className="modal-heading"><div><p className="eyebrow">Document vault</p><h2 id="upload-title">Add a document</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
      <label>Document title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Office insurance policy" required /></label>
      <div className="form-grid"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}>{["HR", "IT", "Finance", "Operations"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="form-grid"><label>Expiry date<input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} required /></label><label>File<input type="file" accept="application/pdf,image/*" onChange={(event) => selectFile(event.target.files?.[0])} />{fileDetails && <span className="file-details">{fileDetails.name} · {fileDetails.size}</span>}{fileError && <span className="form-error">{fileError}</span>}</label></div>
      <p className="helper">The file is validated and represented locally until Supabase Storage is connected.</p>
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={Boolean(fileError)}>Add document</button></div>
    </form>
  </div>;
}
