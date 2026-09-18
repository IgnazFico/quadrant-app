"use client";

import { useState } from "react";

type FeedbackCategory = "idea" | "friction" | "bug";

export function FeedbackModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<FeedbackCategory>("friction");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          metadata: {
            pathname: typeof window !== "undefined" ? window.location.pathname : "",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send feedback");
      }

      setStatus("success");
      setMessage("");
      setTimeout(() => {
        setStatus("idle");
        onClose();
      }, 1800);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl border border-[#ECE8DF] bg-white p-6 shadow-2xl transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F2937]">Beta Feedback</h3>
            <p className="font-sans text-xs text-[#6B7280]">
              Help shape the anti-burnout life architecture
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-[#F3F4F6] hover:text-[#1F2937]"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h4 className="font-sans text-sm font-bold text-[#1F2937]">Thank you for your voice</h4>
            <p className="mt-1 font-sans text-xs text-[#6B7280]">
              Your reflection has been sent to the core team.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "friction", label: "Friction / UX" },
                    { id: "bug", label: "Bug / Glitch" },
                    { id: "idea", label: "Idea / Feature" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`rounded-xl border py-2 text-center text-xs font-semibold transition ${
                      category === item.id
                        ? "border-[#F97316] bg-[#FFF7ED] text-[#EA580C]"
                        : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#D1D5DB]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Your Observation
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What felt confusing, satisfying, or missing while planning your week?"
                rows={4}
                required
                className="w-full resize-none rounded-xl border border-[#D1D5DB] p-3 text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
              <div className="mt-1 flex justify-between text-[10px] text-[#9CA3AF]">
                <span>No private goal reflections or keys are transmitted.</span>
                <span>{message.length}/2000</span>
              </div>
            </div>

            {status === "error" && (
              <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <a
                href={`mailto:support@quadrant.me?subject=[Beta Feedback] ${category}&body=${encodeURIComponent(
                  message,
                )}`}
                className="text-[11px] font-medium text-[#6B7280] underline hover:text-[#1F2937]"
              >
                Or email support@quadrant.me
              </a>
              <button
                type="submit"
                disabled={status === "submitting" || !message.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-[#F97316] px-5 py-2.5 font-sans text-xs font-bold text-white shadow-md transition hover:bg-[#EA6A0C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "submitting" ? "Sending..." : "Submit Reflection"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
