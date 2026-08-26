"use client";

import { useState } from "react";

export function RecoveryCodeReveal({
  code,
  onConfirm,
}: {
  code: string;
  onConfirm: () => void;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col">
      <p className="mb-1 font-serif text-lg font-semibold text-[#1F2937]">Save your recovery code</p>
      <p className="mb-5 text-sm leading-relaxed text-[#6B7280]">
        This is the only way back into your account if you forget your password. We can&apos;t
        recover it for you — there&apos;s no copy on our end.
      </p>

      <div className="mb-4 select-all rounded-lg border border-dashed border-[#DAD5C9] bg-[#FCFBF8] px-4 py-4 text-center font-mono text-sm tracking-wide text-[#1F2937]">
        {code}
      </div>

      <label className="mb-5 flex items-start gap-2 text-xs text-[#6B7280]">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="mt-0.5"
        />
        I&apos;ve written this down or saved it somewhere safe, outside this app.
      </label>

      <button
        disabled={!saved}
        onClick={onConfirm}
        className="rounded-[10px] bg-[#F97316] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#F0D9C6]"
      >
        Continue
      </button>
    </div>
  );
}
