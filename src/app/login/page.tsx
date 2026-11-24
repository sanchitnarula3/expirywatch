"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (!email || !password) { setError("Enter your email and password to continue."); return; } setError(""); router.push("/dashboard"); }
  return <main className="auth-shell"><section className="auth-brand"><div className="brand-mark">E</div><p className="eyebrow">ExpiryWatch</p><h1>Stay ahead of every renewal.</h1><p>One calm, clear view of the documents your organisation cannot afford to forget.</p><div className="auth-note"><span>✓</span><div><strong>Built for teams</strong><br /><small>Department-aware document tracking</small></div></div></section><section className="auth-panel"><div className="auth-form"><p className="eyebrow">Welcome back</p><h2>Sign in to your workspace</h2><p className="muted">Use your organisation account to continue.</p><form onSubmit={submit}><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" required /></label><label>Password<div className="password-field"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required /><button type="button" className="show-password" onClick={(event) => { const input = event.currentTarget.previousElementSibling as HTMLInputElement; input.type = input.type === "password" ? "text" : "password"; }}>Show</button></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide">Sign in <span>→</span></button></form><p className="form-footnote">Authentication is ready to connect to Supabase Auth.</p></div></section></main>;
}
