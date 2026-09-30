// GROWTH-RING-REDESIGN: shared shapes for the constellation that replaces the growth ring.

/** Twelve monthly scores, Jan..Dec. 0..1 = share of finished goals that were done; null = no finished goals. */
export type MonthScores = (number | null)[];

export type YearScores = {
  year: number;
  months: MonthScores;
  /** A year that has ended always draws as a closed loop. */
  sealed: boolean;
};

export type RoleConstellation = {
  roleId: string;
  label: string;
  domain: string;
  /** Oldest first. */
  years: YearScores[];
};
