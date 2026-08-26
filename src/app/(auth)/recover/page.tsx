"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  recoverStartSchema,
  recoverFinishSchema,
} from "../../../../lib/validators";
import {
  fromBase64,
  toBase64,
  deriveKey,
  unwrapMasterKey,
  wrapMasterKey,
  generateSalt,
} from "../../../../lib/crypto";
import "../auth.css";

type Step = "identify" | "newPassword" | "done";

export default function RecoverPage() {
  const [step, setStep] = useState<Step>("identify");
  const [error, setError] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState<Uint8Array | null>(null);
  const [email, setEmail] = useState("");

  const identifyForm = useForm({ resolver: zodResolver(recoverStartSchema) });
  const passwordForm = useForm({ resolver: zodResolver(recoverFinishSchema) });

  async function onIdentify(data: { email: string; recoveryCode: string }) {
    setError(null);
    try {
      const res = await fetch(
        `/api/auth/recover-challenge?email=${encodeURIComponent(data.email)}`,
      );
      if (!res.ok) {
        setError("No account found with that email");
        return;
      }
      const { saltRecovery, wrappedKeyRecovery } = await res.json();

      const salt = await fromBase64(saltRecovery);
      const recoveryKey = await deriveKey(data.recoveryCode.trim(), salt);
      const key = await unwrapMasterKey(
        await fromBase64(wrappedKeyRecovery),
        recoveryKey,
      );

      setMasterKey(key);
      setEmail(data.email);
      setStep("newPassword");
    } catch {
      setError("That recovery code doesn't match this account");
    }
  }

  async function onSetNewPassword(data: { newPassword: string }) {
    if (!masterKey) return;
    setError(null);
    try {
      const saltPassword = await generateSalt();
      const passwordKey = await deriveKey(data.newPassword, saltPassword);
      const wrappedKeyPassword = await wrapMasterKey(masterKey, passwordKey);

      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          newPassword: data.newPassword,
          saltPassword: await toBase64(saltPassword),
          wrappedKeyPassword: await toBase64(wrappedKeyPassword),
        }),
      });

      if (!res.ok) {
        setError("Something went wrong resetting your password");
        return;
      }
      setStep("done");
    } catch {
      setError("Something went wrong resetting your password");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F2] px-6">
      <div className="w-full max-w-[400px]">
        <p className="mb-1 font-serif text-xl font-semibold text-[#1F2937]">
          Recover your account
        </p>
        <p className="mb-6 text-sm text-[#6B7280]">
          Your recovery code unlocks the same data your password did — nothing
          is lost.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error}
          </p>
        )}

        {step === "identify" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={identifyForm.handleSubmit(onIdentify)}
          >
            <input
              type="email"
              placeholder="you@email.com"
              className="auth-input"
              {...identifyForm.register("email")}
            />
            <input
              type="text"
              placeholder="Recovery code (e.g. 9F3K-QP2L-...)"
              className="auth-input font-mono"
              {...identifyForm.register("recoveryCode")}
            />
            <button type="submit" className="auth-btn-primary">
              Continue
            </button>
          </form>
        )}

        {step === "newPassword" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={passwordForm.handleSubmit(onSetNewPassword)}
          >
            <input
              type="password"
              placeholder="Choose a new password"
              className="auth-input"
              {...passwordForm.register("newPassword")}
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-xs text-[#C0392B]">
                {passwordForm.formState.errors.newPassword.message as string}
              </p>
            )}
            <button type="submit" className="auth-btn-primary">
              Set new password
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="rounded-lg bg-[#E9FAEF] px-4 py-4 text-sm text-[#1F6B3A]">
            Password updated. You can log in with it now — your data is
            unchanged.
          </div>
        )}
      </div>
    </div>
  );
}
