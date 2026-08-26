export function AssuranceNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-[10px] border border-[#FCE3C3] bg-[#FFF7EA] px-3 py-2.5 text-xs leading-relaxed text-[#7A5A2E]">
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0 text-[#FB923C]"
      >
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
