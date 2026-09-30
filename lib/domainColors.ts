export const DOMAIN_COLOR: Record<string, string> = {
  career: "#F97316",
  family: "#1E3A8A",
  growth: "#FB923C",
  health: "#22C55E",
  relationships: "#FACC15",
  community: "#F97316",
  values: "#1E3A8A",
};

export function domainColor(domain: string): string {
  return DOMAIN_COLOR[domain] ?? "#F97316";
}

// GROWTH-RING-REDESIGN: star colors. The domain palette has a deep navy and a
// pale yellow that both lose their glow at 1px, so the constellation lifts them.
const CONSTELLATION_TINT: Record<string, string> = {
  family: "#3F5FC4",
  values: "#3F5FC4",
  relationships: "#EAB308",
};

export function constellationTint(domain: string): string {
  return CONSTELLATION_TINT[domain] ?? domainColor(domain);
}
