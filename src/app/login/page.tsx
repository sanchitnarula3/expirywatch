"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInLocally } from "@/lib/local-auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { signInWithSupabase, signUpWithSupabase } from "@/lib/supabase/services";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Operations");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    setSupabaseReady(isSupabaseConfigured());
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!email || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (!supabaseReady) {
      // Demo / Local mock mode
      signInLocally(email);
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError("Please provide your full name.");
          setLoading(false);
          return;
        }
        await signUpWithSupabase(email, password, fullName.trim(), department);
        setNotice("Account created! Signing you in...");
        try {
          await signInWithSupabase(email, password);
          signInLocally(email);
          router.push("/dashboard");
        } catch {
          setNotice("Account registered. Please check email confirmation if enabled, or sign in.");
          setIsSignUp(false);
        }
      } else {
        await signInWithSupabase(email, password);
        signInLocally(email);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div className="brand-mark">E</div>
        <p className="eyebrow">ExpiryWatch</p>
        <h1>Stay ahead of every renewal.</h1>
        <p>One calm, clear view of the documents your organisation cannot afford to forget.</p>
        <div className="auth-note">
          <span>✓</span>
          <div>
            <strong>Built for teams</strong>
            <br />
            <small>Department-aware document tracking with Supabase RLS</small>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form">
          <p className="eyebrow">{isSignUp ? "Get started" : "Welcome back"}</p>
          <h2>{isSignUp ? "Create your account" : "Sign in to your workspace"}</h2>
          <p className="muted">
            {supabaseReady
              ? "Connected to live Supabase backend."
              : "Demo mode: this session stays in this browser until Supabase keys are configured in .env.local."}
          </p>

          <form onSubmit={submit}>
            {isSignUp && (
              <>
                <label>
                  Full name
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="e.g. Sanchit Narula"
                    required
                  />
                </label>

                <label>
                  Department
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                  >
                    {["HR", "IT", "Finance", "Operations"].map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
                required
              />
            </label>

            <label>
              Password
              <div className="password-field">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="show-password"
                  onClick={(event) => {
                    const input = event.currentTarget.previousElementSibling as HTMLInputElement;
                    input.type = input.type === "password" ? "text" : "password";
                  }}
                >
                  Show
                </button>
              </div>
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="inline-notice" role="status">
                {notice}
              </p>
            )}

            <button
              className="button button-primary button-wide"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : isSignUp ? "Create Account" : "Sign in"}{" "}
              <span>→</span>
            </button>
          </form>

          {supabaseReady && (
            <p className="form-footnote" style={{ marginTop: "1rem", textAlign: "center" }}>
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--accent, #2563eb)", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => { setIsSignUp(false); setError(""); setNotice(""); }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Need an account?{" "}
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--accent, #2563eb)", cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => { setIsSignUp(true); setError(""); setNotice(""); }}
                  >
                    Register here
                  </button>
                </>
              )}
            </p>
          )}

          {!supabaseReady && (
            <p className="form-footnote">
              Tip: Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to connect live authentication.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
