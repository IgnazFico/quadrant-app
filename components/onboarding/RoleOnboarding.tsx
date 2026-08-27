"use client";

import { useMemo, useState } from "react";
import { DOMAINS, domainLabel } from "../../lib/domains";

type Step = 1 | 2 | 3 | 4; // 4 = done

function QuadMark({ lit, size = 16 }: { lit: boolean; size?: number }) {
  return (
    <div
      className="grid grid-cols-2 grid-rows-2 gap-[2px] shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="rounded-[2px] bg-[#F3F4F6]" />
      <span
        className={`rounded-[2px] ${lit ? "bg-[#F97316]" : "bg-[#F3F4F6]"}`}
      />
      <span className="rounded-[2px] bg-[#F3F4F6]" />
      <span className="rounded-[2px] bg-[#F3F4F6]" />
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors ${
        selected
          ? "bg-[#F97316] text-white shadow-[0_0_0_2px_#FFF9F2,0_0_0_4px_#FACC15]"
          : "bg-[#F3F4F6] text-[#1F2937] hover:bg-[#EAECEF]"
      }`}
    >
      <QuadMark lit={selected} />
      <span>{label}</span>
    </button>
  );
}

export function RoleOnboarding() {
  const [step, setStep] = useState<Step>(1);
  const [domains, setDomains] = useState<Set<string>>(new Set());
  const [roles, setRoles] = useState<Set<string>>(new Set()); // keys: "domainId::roleName"
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDomain(id: string) {
    setDomains((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleRole(key: string) {
    setRoles((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const selectedRoleEntries = useMemo(
    () =>
      [...roles].map((key) => {
        const [domainId, roleName] = key.split("::");
        return { key, domainId, roleName, label: labels[key] ?? roleName };
      }),
    [roles, labels],
  );

  const canContinueStep1 = domains.size > 0;
  const canContinueStep2 = roles.size > 0;

  async function finish() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roles: selectedRoleEntries.map((r) => ({
            domain: r.domainId,
            label: r.label,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error?.formErrors?.[0] ?? "Couldn't save your roles — try again",
        );
        setSubmitting(false);
        return;
      }
      setStep(4);
    } catch {
      setError("Couldn't save your roles — try again");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#FFF9F2] px-6 py-8">
      <div className="w-full max-w-[560px]">
        <div className="mb-8 flex items-center gap-2.5">
          <QuadMark lit size={20} />
          <span className="font-serif text-[19px] font-semibold text-[#1F2937]">
            Quadrant
          </span>
        </div>

        {step < 4 && (
          <>
            <div className="mb-2 flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-[#F3F4F6]"
                >
                  <div
                    className="h-full bg-[#F97316] transition-all duration-300"
                    style={{
                      width: step > i ? "100%" : step === i ? "50%" : "0%",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mb-9 flex justify-between font-mono text-[11px] uppercase tracking-wide text-[#9CA3AF]">
              <span className={step === 1 ? "text-[#F97316]" : ""}>
                Domains
              </span>
              <span className={step === 2 ? "text-[#F97316]" : ""}>Roles</span>
              <span className={step === 3 ? "text-[#F97316]" : ""}>
                Personalize
              </span>
            </div>
          </>
        )}

        {error && (
          <p className="mb-5 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error}
          </p>
        )}

        {step === 1 && (
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-[#F97316]">
              Step 1 of 3
            </p>
            <h1 className="mb-2.5 font-serif text-[26px] font-semibold leading-tight text-[#1F2937]">
              Which parts of life are you juggling right now?
            </h1>
            <p className="mb-7 max-w-[42ch] text-[15px] leading-relaxed text-[#4B5563]">
              Pick as many as feel true. This isn&apos;t permanent — you can
              adjust it later.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {DOMAINS.map((d) => (
                <Chip
                  key={d.id}
                  label={d.label}
                  selected={domains.has(d.id)}
                  onClick={() => toggleDomain(d.id)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-[#F97316]">
              Step 2 of 3
            </p>
            <h1 className="mb-2.5 font-serif text-[26px] font-semibold leading-tight text-[#1F2937]">
              Now, who are you inside each of those?
            </h1>
            <p className="mb-7 max-w-[42ch] text-[15px] leading-relaxed text-[#4B5563]">
              These aren&apos;t job titles — they&apos;re the identities
              you&apos;re actually showing up as.
            </p>
            {DOMAINS.filter((d) => domains.has(d.id)).map((d) => (
              <div key={d.id} className="mb-6">
                <p className="mb-2.5 font-mono text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  {d.label}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {d.roles.map((r) => {
                    const key = `${d.id}::${r}`;
                    return (
                      <Chip
                        key={key}
                        label={r}
                        selected={roles.has(key)}
                        onClick={() => toggleRole(key)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-[#F97316]">
              Step 3 of 3
            </p>
            <h1 className="mb-2.5 font-serif text-[26px] font-semibold leading-tight text-[#1F2937]">
              Make these labels yours
            </h1>
            <p className="mb-7 max-w-[42ch] text-[15px] leading-relaxed text-[#4B5563]">
              Edit any name so it actually sounds like you.
            </p>
            <div className="flex flex-col gap-2.5">
              {selectedRoleEntries.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center gap-3 rounded-[10px] bg-[#F3F4F6] px-3.5 py-3"
                >
                  <span className="shrink-0 whitespace-nowrap rounded-md bg-[#FFF1E4] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[#F97316]">
                    {domainLabel(r.domainId)}
                  </span>
                  <input
                    className="flex-1 border-b border-transparent bg-transparent py-1 text-[15px] font-medium text-[#1F2937] focus:border-[#F97316] focus:outline-none"
                    value={labels[r.key] ?? r.roleName}
                    onChange={(e) =>
                      setLabels((prev) => ({
                        ...prev,
                        [r.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#22C55E]">
              <svg
                viewBox="0 0 24 24"
                width="26"
                height="26"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="mb-2.5 font-serif text-[26px] font-semibold text-[#1F2937]">
              Your roles are set
            </h1>
            <p className="max-w-[42ch] text-[15px] leading-relaxed text-[#4B5563]">
              Next, we&apos;ll help you set two or three Quadrant II goals for
              each one — the important-but-not-urgent stuff that actually moves
              the needle.
            </p>
          </div>
        )}

        {step < 4 && (
          <div className="mt-8 flex justify-end gap-3">
            {step > 1 && (
              <button
                className="rounded-[10px] border border-[#E2E4E8] px-5 py-3 text-sm font-semibold text-[#1F2937] hover:bg-[#F3F4F6]"
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                Back
              </button>
            )}
            <button
              disabled={
                (step === 1 && !canContinueStep1) ||
                (step === 2 && !canContinueStep2) ||
                submitting
              }
              onClick={() => {
                if (step === 3) return finish();
                setStep((s) => (s + 1) as Step);
              }}
              className="rounded-[10px] bg-[#F97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#EA6A0C] disabled:bg-[#F0D9C6]"
            >
              {step === 3 ? (submitting ? "Saving..." : "Finish") : "Continue"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="mt-8 flex justify-end">
            <a
              href="/goals"
              className="rounded-[10px] bg-[#F97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#EA6A0C]"
            >
              Start setting goals
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
