"use client";

import { useEffect, useState } from "react";

/**
 * The code-entry step after "Create account" (WO-012, D-024).
 * Posts to /api/auth/verify-email and /api/auth/resend-code. It never sees or
 * stores key material; the sign-up form keeps that in memory.
 */
export function EmailCodeStep({
  email,
  initialCooldown,
  onVerified,
  onBack,
}: {
  email: string;
  initialCooldown: number;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (res.ok) {
        onVerified();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "That code didn't work. Please try again.");
      if (body.code === "expired" || body.code === "locked") setCode("");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setCode("");
        setInfo("A new code is on its way.");
        setCooldown(body.retryAfter ?? 60);
      } else {
        setError(body.error ?? "We couldn't send a new code. Please try again.");
        if (typeof body.retryAfter === "number") setCooldown(body.retryAfter);
      }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <p className="mb-1 font-serif text-xl font-semibold text-[#1F2937]">
        Check your email
      </p>
      <p className="mb-5 text-sm text-[#6B7280]">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-[#1F2937]">{email}</span>. It works
        for 10 minutes.
      </p>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]"
        >
          {error}
        </p>
      )}
      {info && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-[#E9FAEF] px-3 py-2 text-xs text-[#1F6B3A]"
        >
          {info}
        </p>
      )}

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          aria-label="6-digit code"
          placeholder="123456"
          className="auth-input text-center font-mono text-lg tracking-[0.4em]"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoFocus
        />
        <button
          type="submit"
          className="auth-btn-primary"
          disabled={busy || code.length !== 6}
        >
          Verify email
        </button>
      </form>

      <button
        type="button"
        onClick={resend}
        disabled={busy || cooldown > 0}
        className="mt-4 text-center text-xs text-[#9CA3AF] hover:text-[#F97316] disabled:opacity-60 disabled:hover:text-[#9CA3AF]"
      >
        {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 text-center text-xs text-[#9CA3AF] hover:text-[#F97316]"
      >
        Use a different email
      </button>
    </div>
  );
}
