export type Domain = {
  id: string;
  label: string;
  roles: string[];
};

export const DOMAINS: Domain[] = [
  { id: "family", label: "Family", roles: ["Parent", "Partner", "Sibling", "Adult child", "Caregiver"] },
  { id: "career", label: "Career", roles: ["Professional", "Team lead", "Mentor", "Founder", "Student"] },
  { id: "health", label: "Health & body", roles: ["Athlete", "Sleeper", "Nutrition-minded", "Rehabber"] },
  { id: "growth", label: "Mind & growth", roles: ["Learner", "Reader", "Reflector", "Skill-builder"] },
  { id: "relationships", label: "Relationships", roles: ["Friend", "Neighbor", "Confidant"] },
  { id: "community", label: "Community", roles: ["Volunteer", "Organizer", "Contributor"] },
  { id: "values", label: "Spiritual & values", roles: ["Seeker", "Practitioner", "Steward"] },
];

export function domainLabel(domainId: string): string {
  return DOMAINS.find((d) => d.id === domainId)?.label ?? domainId;
}
