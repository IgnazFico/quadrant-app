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
