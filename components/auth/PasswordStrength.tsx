const LABELS = ["Short", "Good length", "Strong"];
const COLORS = ["#FB923C", "#FACC15", "#22C55E"];

function scoreOf(password: string) {
  if (password.length >= 14) return 3;
  if (password.length >= 10) return 2;
  if (password.length >= 6) return 1;
  return 0;
}

export function PasswordStrength({ password }: { password: string }) {
  const score = scoreOf(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i < score ? COLORS[Math.min(score, 3) - 1] : "#F3F4F6" }}
          />
        ))}
      </div>
      <div className="mt-1.5 font-mono text-[10px] text-[#B7B2A7]">
        {password.length === 0 ? "\u00A0" : LABELS[Math.max(score - 1, 0)]}
      </div>
    </div>
  );
}
