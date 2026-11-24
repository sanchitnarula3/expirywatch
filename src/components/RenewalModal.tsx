"use client";

import { FormEvent, useState } from "react";
import { DocumentRecord } from "@/types/database";

export function RenewalModal({ document, onClose, onSubmit }: { document: DocumentRecord; onClose: () => void; onSubmit: (date: string, notes: string) => void }) {
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (date) onSubmit(date, notes.trim()); }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal" onSubmit={submit} aria-labelledby="renew-title"><div className="modal-heading"><div><p className="eyebrow">Renewal history</p><h2 id="renew-title">Renew document</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button></div><p className="modal-context">{document.title}<br /><span>Current expiry: {document.expiry_date}</span></p><label>New expiry date<input type="date" value={date} min={document.expiry_date} onChange={(event) => setDate(event.target.value)} required /></label><label>Notes <span className="muted">(optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Add a note about this renewal" /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary">Save renewal</button></div></form></div>;
}
