"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "../../lib/validators";
import {
  generateSalt,
  deriveKey,
  generateMasterKey,
  generateRecoveryCode,
  wrapMasterKey,
  unwrapMasterKey,
  toBase64,
  fromBase64,
} from "../../lib/crypto";
import { useAuthStore } from "../../store/authStore";
import { AssuranceNote } from "./AssuranceNote";
import { PasswordStrength } from "./PasswordStrength";
import { RecoveryCodeReveal } from "./RecoveryCodeReveal";

type Tab = "login" | "signup";

export function AuthForm() {
  const [tab, setTab] = useState<Tab>("login");
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState<string | null>(
    null,
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const setMasterKey = useAuthStore((s) => s.setMasterKey);

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });
  const signupPassword = signupForm.watch("password") ?? "";

  // ---------------- LOGIN ----------------
  async function onLogin(data: LoginInput) {
    setServerError(null);
    try {
      // 1. Fetch the (non-secret) salt + wrapped key for this email.
      const res = await fetch(
        `/api/auth/login-challenge?email=${encodeURIComponent(data.email)}`,
      );
      if (!res.ok) {
        setServerError("No account found with that email");
        return;
      }
      const { saltPassword, wrappedKeyPassword } = await res.json();

      // 2. Derive the password key locally and try to unwrap the master key.
      //    A wrong password fails here, before any session is created.
      const salt = await fromBase64(saltPassword);
      const derived = await deriveKey(data.password, salt);
      const masterKey = await unwrapMasterKey(
        await fromBase64(wrappedKeyPassword),
        derived,
      );

      // 3. Separately, authenticate the session via Auth.js (server-side bcrypt check).
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setServerError("Incorrect email or password");
        return;
      }

      // 4. Keep the master key in memory only, for use during this session.
      setMasterKey(masterKey);
      window.location.href = "/";
    } catch (err: any) {
      setServerError(err?.message ?? "Incorrect email or password");
    }
  }

  // ---------------- SIGNUP ----------------
  async function onSignup(data: SignupInput) {
    setServerError(null);
    try {
      const masterKey = await generateMasterKey();

      const saltPassword = await generateSalt();
      const saltRecovery = await generateSalt();

      const passwordKey = await deriveKey(data.password, saltPassword);
      const recoveryCode = await generateRecoveryCode();
      const recoveryKey = await deriveKey(recoveryCode, saltRecovery);

      const wrappedKeyPassword = await wrapMasterKey(masterKey, passwordKey);
      const wrappedKeyRecovery = await wrapMasterKey(masterKey, recoveryKey);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          saltPassword: await toBase64(saltPassword),
          saltRecovery: await toBase64(saltRecovery),
          wrappedKeyPassword: await toBase64(wrappedKeyPassword),
          wrappedKeyRecovery: await toBase64(wrappedKeyRecovery),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerError(
          body.error ?? "Something went wrong creating your account",
        );
        return;
      }

      setMasterKey(masterKey);
      setPendingRecoveryCode(recoveryCode); // gate: must confirm before continuing
    } catch (err: any) {
      setServerError(
        err?.message ?? "Something went wrong creating your account",
      );
    }
  }

  async function finishSignup() {
    const email = signupForm.getValues("email");
    const password = signupForm.getValues("password");
    await signIn("credentials", { email, password, redirect: false });
    window.location.href = "/";
  }

  // Recovery code must be acknowledged before the user can proceed.
  if (pendingRecoveryCode) {
    return (
      <RecoveryCodeReveal code={pendingRecoveryCode} onConfirm={finishSignup} />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex rounded-[11px] bg-[#F3F4F6] p-1">
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            tab === "login"
              ? "bg-white text-[#1F2937] shadow-sm"
              : "text-[#9CA3AF]"
          }`}
          onClick={() => setTab("login")}
        >
          Log in
        </button>
        <button
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            tab === "signup"
              ? "bg-white text-[#1F2937] shadow-sm"
              : "text-[#9CA3AF]"
          }`}
          onClick={() => setTab("signup")}
        >
          Create account
        </button>
      </div>

      {serverError && (
        <p className="mb-4 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
          {serverError}
        </p>
      )}

      {tab === "login" ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={loginForm.handleSubmit(onLogin)}
        >
          <Field label="Email">
            <input
              type="email"
              className="auth-input"
              placeholder="you@email.com"
              {...loginForm.register("email")}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className="auth-input"
              placeholder="Your password"
              {...loginForm.register("password")}
            />
          </Field>
          <button type="submit" className="auth-btn-primary">
            Log in
          </button>
          <a
            href="/recover"
            className="text-center text-xs text-[#9CA3AF] hover:text-[#F97316]"
          >
            Forgot password?
          </a>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={signupForm.handleSubmit(onSignup)}
        >
          <Field label="Email">
            <input
              type="email"
              className="auth-input"
              placeholder="you@email.com"
              {...signupForm.register("email")}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              className="auth-input"
              placeholder="Create a password"
              {...signupForm.register("password")}
            />
            <PasswordStrength password={signupPassword} />
          </Field>

          <AssuranceNote>
            This password also unlocks your private entries, so choose one
            you&apos;ll remember — it&apos;s yours alone, and we&apos;ll never
            be able to see or reset it.
          </AssuranceNote>

          <button type="submit" className="auth-btn-primary">
            Create account
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wide text-[#9CA3AF]">
        {label}
      </label>
      {children}
    </div>
  );
}
