"use client";

import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { encryptField, toBase64 } from "../../lib/crypto";
import Link from "next/link";

type Screen =
  | "intro"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "assemble"
  | "sign"
  | "done";
const QUESTION_SCREENS: Screen[] = ["q1", "q2", "q3", "q4"];

const PREVIEW = [
  "Who you want to be, at your best",
  "What you want to have contributed",
  "What you won't compromise on",
  "A phrase for how you want to live",
];

export function MissionStatementFlow() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [answers, setAnswers] = useState({ a1: "", a2: "", a3: "", a4: "" });
  const [draft, setDraft] = useState("");
  const [signedName, setSignedName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const masterKey = useAuthStore((s) => s.masterKey);

  const qIndex = QUESTION_SCREENS.indexOf(screen);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function assemble() {
    const a1 = answers.a1.trim() || "someone who shows up, even imperfectly";
    const a2 = answers.a2.trim() || "something worth remembering";
    const a3 = answers.a3.trim() || "my own honesty";
    const a4 = answers.a4.trim();
    let text = `I want to be ${a1}. I want to have contributed ${a2} to the people and things I care about. I'm not willing to compromise on ${a3}.`;
    if (a4) text += ` Above all: ${a4}.`;
    setDraft(text);
    setScreen("assemble");
  }

  async function commit() {
    if (!masterKey) {
      setError(
        "Your session key isn't available — please log in again to continue.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const encrypted = await encryptField(draft, masterKey);
      const contentEncrypted = await toBase64(encrypted);

      const res = await fetch("/api/mission-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentEncrypted, signedName }),
      });

      if (!res.ok) {
        setError("Something went wrong saving this — try again.");
        setSaving(false);
        return;
      }
      setScreen("done");
    } catch {
      setError("Something went wrong saving this — try again.");
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#FFF9F2] px-6 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-2 flex items-center gap-2">
          <div className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-[2px]">
            <span className="rounded-[2px] bg-[#F3F4F6]" />
            <span className="rounded-[2px] bg-[#F97316]" />
            <span className="rounded-[2px] bg-[#F3F4F6]" />
            <span className="rounded-[2px] bg-[#F3F4F6]" />
          </div>
          <span className="font-serif text-[15px] font-semibold text-[#C9CBCF]">
            Quadrant
          </span>
        </div>

        {qIndex >= 0 && (
          <div className="mb-2 mt-6 flex justify-center gap-1.5">
            {QUESTION_SCREENS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i <= qIndex ? "w-4 bg-[#F97316]" : "w-1.5 bg-[#F3F4F6]"
                }`}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-lg bg-[#FDECEC] px-3 py-2 text-xs text-[#C0392B]">
            {error}
          </p>
        )}

        {/* INTRO — the milestone framing this was specifically asked for */}
        {screen === "intro" && (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="mb-6 grid h-11 w-11 grid-cols-2 grid-rows-2 gap-1">
              <span className="rounded-md bg-[#F3F4F6]" />
              <span className="rounded-md bg-[#F97316]" />
              <span className="rounded-md bg-[#F3F4F6]" />
              <span className="rounded-md bg-[#F3F4F6]" />
            </div>
            <p className="mb-3.5 font-mono text-[11px] uppercase tracking-wide text-[#F97316]">
              Seven days in
            </p>
            <h1 className="mb-4 font-serif text-[26px] font-semibold leading-tight text-[#1F2937]">
              You've shown up for seven days. Let's write down why.
            </h1>
            <p className="mb-7 max-w-[36ch] text-sm leading-relaxed text-[#6B7280]">
              A week of actually using Quadrant tells us something a first-day
              sign-up never could — you're someone who follows through. Before
              you keep building habits, it's worth knowing what you're building
              them <em>for</em>.
            </p>

            <div className="mb-8 w-full rounded-xl border border-[#ECE8DF] bg-white p-4 text-left">
              <p className="mb-3 font-mono text-[10.5px] uppercase tracking-wide text-[#9CA3AF]">
                What's coming next — four short prompts
              </p>
              <ol className="flex flex-col gap-2.5">
                {PREVIEW.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[13.5px] text-[#374151]"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] font-mono text-[10px] text-[#9CA3AF]">
                      {i + 1}
                    </span>
                    {p}
                  </li>
                ))}
              </ol>
            </div>

            <p className="mb-8 max-w-[36ch] text-xs leading-relaxed text-[#9CA3AF]">
              There's no wrong answer here, and nothing to prepare in advance —
              just write what's honestly true right now. This only happens once,
              so we won&apos;t rush you, but we also won&apos;t skip it.
            </p>

            <button
              onClick={() => setScreen("q1")}
              className="w-full rounded-[10px] bg-[#F97316] py-3.5 text-sm font-semibold text-white hover:bg-[#EA6A0C]"
            >
              Begin
            </button>
          </div>
        )}

        {/* QUESTIONS */}
        {screen === "q1" && (
          <Question
            index={1}
            prompt="Who do you want to be, at your best?"
            value={answers.a1}
            onChange={(v) => setAnswers((a) => ({ ...a, a1: v }))}
            onBack={() => setScreen("intro")}
            onNext={() => setScreen("q2")}
          />
        )}
        {screen === "q2" && (
          <Question
            index={2}
            prompt="What do you want to have contributed to the people and things you care about?"
            value={answers.a2}
            onChange={(v) => setAnswers((a) => ({ ...a, a2: v }))}
            onBack={() => setScreen("q1")}
            onNext={() => setScreen("q3")}
          />
        )}
        {screen === "q3" && (
          <Question
            index={3}
            prompt="What's something you're not willing to compromise on?"
            value={answers.a3}
            onChange={(v) => setAnswers((a) => ({ ...a, a3: v }))}
            onBack={() => setScreen("q2")}
            onNext={() => setScreen("q4")}
          />
        )}
        {screen === "q4" && (
          <Question
            index={4}
            prompt="One phrase that captures how you want to live."
            value={answers.a4}
            optional
            onChange={(v) => setAnswers((a) => ({ ...a, a4: v }))}
            onBack={() => setScreen("q3")}
            onNext={assemble}
            nextLabel="Review draft"
          />
        )}

        {/* ASSEMBLE */}
        {screen === "assemble" && (
          <div className="mt-8">
            <p className="mb-1.5 text-center font-mono text-[10.5px] uppercase tracking-wide text-[#B7B2A7]">
              Your draft
            </p>
            <h1 className="mb-6 text-center font-serif text-[19px] font-semibold text-[#1F2937]">
              Read it back. Edit anything that doesn&apos;t sound like you.
            </h1>
            <div className="relative rounded border border-[#ECE8DF] bg-white p-7 shadow-[0_14px_40px_-20px_rgba(31,41,55,0.25)]">
              <div className="pointer-events-none absolute inset-[10px] rounded-sm border border-[#F1EEE7]" />
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setDraft(e.currentTarget.textContent ?? "")}
                className="font-serif text-[16.5px] leading-[1.85] text-[#1F2937] outline-none"
              >
                {draft}
              </div>
            </div>
            <p className="mt-3.5 text-center font-mono text-[10.5px] text-[#C9CBCF]">
              Tap the text to edit it directly
            </p>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setScreen("sign")}
                className="rounded-[10px] bg-[#F97316] px-5 py-3 text-sm font-semibold text-white hover:bg-[#EA6A0C]"
              >
                Sign and commit
              </button>
            </div>
          </div>
        )}

        {/* SIGN */}
        {screen === "sign" && (
          <div className="mt-10 flex flex-col items-center text-center">
            <h1 className="mb-2.5 font-serif text-[21px] font-semibold text-[#1F2937]">
              Sign and commit to it
            </h1>
            <p className="mb-7 max-w-[30ch] text-[13px] leading-relaxed text-[#6B7280]">
              This won&apos;t lock the words forever — just marks that this is
              where you stood, today.
            </p>
            <input
              type="text"
              placeholder="Type your name"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              className="mb-2 w-full border-b border-[#DAD5C9] bg-transparent pb-2.5 pt-1.5 text-center font-serif text-[34px] text-[#1F2937] outline-none focus:border-[#F97316]"
              style={{ fontFamily: "'Caveat', cursive" }}
            />
            <p className="mb-8 font-mono text-[11px] text-[#B7B2A7]">{today}</p>
            <button
              disabled={signedName.trim().length === 0 || saving}
              onClick={commit}
              className="w-full rounded-[10px] bg-[#F97316] py-3.5 text-sm font-semibold text-white hover:bg-[#EA6A0C] disabled:bg-[#F0D9C6]"
            >
              {saving ? "Committing..." : "Commit"}
            </button>
          </div>
        )}

        {/* DONE — only exit from this flow */}
        {screen === "done" && (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="mb-4.5 flex h-[60px] w-[60px] items-center justify-center rounded-full border border-[#ECE8DF] bg-[#F3F4F6]">
              <div className="grid h-[22px] w-[22px] grid-cols-2 grid-rows-2 gap-1">
                <span className="rounded bg-[#F3F4F6]" />
                <span className="rounded bg-[#F97316]" />
                <span className="rounded bg-[#F3F4F6]" />
                <span className="rounded bg-[#F3F4F6]" />
              </div>
            </div>
            <h1 className="mb-2 font-serif text-xl font-semibold text-[#1F2937]">
              Committed
            </h1>
            <p
              className="mb-0.5 text-[26px]"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              {signedName}
            </p>
            <p className="mb-6 font-mono text-[11px] text-[#B7B2A7]">{today}</p>
            <p className="mb-8 max-w-[30ch] text-xs leading-relaxed text-[#9CA3AF]">
              Quadrant will surface this again next January — not to change it
              on the spot, but to see if it still sounds like you.
            </p>
            <Link
              href="/"
              className="w-full rounded-[10px] bg-[#F97316] py-3.5 text-center text-sm font-semibold text-white hover:bg-[#EA6A0C]"
            >
              Enter Quadrant
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Question({
  index,
  prompt,
  value,
  onChange,
  onBack,
  onNext,
  optional,
  nextLabel,
}: {
  index: number;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  optional?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8">
      <p className="mb-3.5 font-mono text-[10.5px] uppercase tracking-wide text-[#B7B2A7]">
        Question {index} of 4
      </p>
      <h2 className="mb-9 font-serif text-[23px] font-medium leading-snug text-[#1F2937]">
        {prompt}
      </h2>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={optional ? "Optional..." : "Write a few honest words..."}
        className="min-h-[70px] w-full resize-none border-b border-[#DAD5C9] bg-transparent pb-3 pt-1 font-serif text-lg italic text-[#1F2937] outline-none focus:border-[#F97316]"
      />
      {optional && (
        <p className="mt-2 font-mono text-[10px] text-[#C9CBCF]">
          Optional — skip if nothing comes to mind yet.
        </p>
      )}
      <div className="mt-9 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-1 py-2 text-[13px] text-[#B7B2A7] hover:text-[#6B7280]"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="rounded-[10px] bg-[#F97316] px-6 py-3 text-sm font-semibold text-white hover:bg-[#EA6A0C]"
        >
          {nextLabel ?? "Continue"}
        </button>
      </div>
    </div>
  );
}
