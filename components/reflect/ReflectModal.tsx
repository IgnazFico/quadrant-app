"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { domainColor } from "../../lib/domainColors";
import type { Choice, ReviewGoal, ReviewRole } from "../../hooks/useReview";

// ReflectPage mounts the mobile and desktop views together and only hides one
// with CSS, so both see the same activeReflect. Render this dialog only at md+
// (the mobile sheet covers smaller screens); otherwise its scroll lock and Esc
// handler would also run, invisibly, on phones.
const DESKTOP = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(DESKTOP);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useIsDesktop = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);

/**
 * Desktop reflection dialog (md and up). The mobile review keeps its
 * bottom sheet (ReflectSheet in components/review/WeeklyReviewPage.tsx);
 * this is the centred-modal equivalent, styled like the Week page's
 * BlockModal.
 *
 * Same rule as the sheet: no carry/cancel without a written reason. The
 * decision is picked explicitly (prefilled when editing) and saved with one
 * button, rather than the sheet's "reason, then tap a choice" pair.
 */
export function ReflectModal(props: ReflectModalProps) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return null;
  // Portal to <body> so no ancestor (sticky rail, blurred top bar) can clip
  // or re-anchor the fixed overlay.
  return createPortal(<ReflectDialog {...props} />, document.body);
}

type ReflectModalProps = {
  goal: ReviewGoal;
  role: ReviewRole | undefined;
  /** No master key in this tab: the reason can't be encrypted. */
  disabled: boolean;
  onClose: () => void;
  onSubmit: (reason: string, choice: Choice) => Promise<{ ok: boolean }>;
};

function ReflectDialog({ goal, role, disabled, onClose, onSubmit }: ReflectModalProps) {
  const [reason, setReason] = useState(goal.reviewEntry?.reason ?? "");
  const [choice, setChoice] = useState<Choice | null>(goal.reviewEntry?.choice ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const editing = Boolean(goal.reviewEntry);
  const canSave = !disabled && !saving && reason.trim().length > 0 && choice !== null;

  async function save() {
    if (!canSave || !choice) return;
    setSaving(true);
    setError(null);
    const res = await onSubmit(reason.trim(), choice);
    // On success the parent closes the modal (activeReflect -> null).
    if (!res.ok) {
      setSaving(false);
      setError("Couldn't save this reflection. Try again.");
    }
  }

  // Esc closes; Ctrl/Cmd+Enter saves. Page scroll is locked while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, saving]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(31,41,55,0.3)] p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-[520px] flex-col gap-4 rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(31,41,55,0.22)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
              <span>{editing ? "Edit reflection" : "Reflect"}</span>
              {role && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: domainColor(role.domain) }}
                    aria-hidden="true"
                  />
                  <span className="truncate normal-case tracking-normal">{role.label}</span>
                </>
              )}
            </div>
            <h3 id={titleId} className="mt-1 font-serif text-[22px] font-semibold text-[#1F2937]">
              What got in the way?
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="-mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280]"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-[#ECE8DF] bg-[#FCFBF8] px-3.5 py-2.5">
          <span className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-dashed border-[#FB923C] bg-[#FFEFDD]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1F2937]" title={goal.title}>
            {goal.title}
          </span>
          <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#FB923C]">Missed</span>
        </div>

        {disabled && (
          <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            Your session key isn&apos;t available. Log in again to write a reflection.
          </p>
        )}

        <div>
          <label htmlFor={`${titleId}-reason`} className="mb-1 block font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
            Reason
          </label>
          <textarea
            id={`${titleId}-reason`}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              }
            }}
            disabled={disabled || saving}
            rows={4}
            placeholder="Be honest — this is just for you to see the pattern..."
            className="w-full resize-y rounded-lg border border-[#E5E1D8] bg-[#FCFBF8] px-3 py-2.5 text-sm leading-relaxed text-[#1F2937] outline-none focus:border-[#FB923C] disabled:opacity-60"
          />
          <p className="mt-1 text-[11.5px] text-[#9CA3AF]">
            Encrypted on this device. No judgment, just data you can use.
          </p>
        </div>

        <fieldset disabled={disabled || saving}>
          <legend className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#9CA3AF]">
            What happens next
          </legend>
          <div role="radiogroup" aria-label="What happens next" className="grid grid-cols-2 gap-2.5">
            <ChoiceCard
              selected={choice === "CARRY"}
              onSelect={() => setChoice("CARRY")}
              title="Carry to next week"
              hint="It still matters. Give it another go."
              tone="carry"
            />
            <ChoiceCard
              selected={choice === "CANCEL"}
              onSelect={() => setChoice("CANCEL")}
              title="Let it go"
              hint="A decision, not a failure."
              tone="cancel"
            />
          </div>
        </fieldset>

        {error && <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">{error}</p>}

        <div className="mt-0.5 flex items-center gap-2">
          <span className="hidden flex-1 font-mono text-[10.5px] text-[#B5B0A6] lg:block">Ctrl + Enter to save</span>
          <span className="flex-1 lg:hidden" />
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-[#E5E1D8] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F2937] hover:bg-[#FCFBF8]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#EA6A0C] disabled:bg-[#F0D9C6]"
          >
            {saving ? "Saving..." : editing ? "Save changes" : "Save reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onSelect,
  title,
  hint,
  tone,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
  tone: "carry" | "cancel";
}) {
  const on =
    tone === "carry"
      ? "border-[#F97316] bg-[#FFF7ED] shadow-[0_0_0_1px_#F97316]"
      : "border-[#6B7280] bg-[#F7F6F3] shadow-[0_0_0_1px_#6B7280]";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-60 ${
        selected ? on : "border-[#E5E1D8] bg-white hover:bg-[#FCFBF8]"
      }`}
    >
      <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#1F2937]">
        <span
          className={`grid h-4 w-4 place-items-center rounded-full border ${
            selected ? (tone === "carry" ? "border-[#F97316]" : "border-[#6B7280]") : "border-[#D6D2C8]"
          }`}
          aria-hidden="true"
        >
          {selected && (
            <span className={`h-2 w-2 rounded-full ${tone === "carry" ? "bg-[#F97316]" : "bg-[#6B7280]"}`} />
          )}
        </span>
        {title}
      </span>
      <span className="pl-6 text-[11.5px] text-[#8A8579]">{hint}</span>
    </button>
  );
}
