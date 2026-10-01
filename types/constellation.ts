// GROWTH-RING-REDESIGN: shared shapes for the constellation that replaces the growth ring.
//
// The constellation measures showing up, like the year ceremony: how many goals
// were finished each month, never a success rate. There is no target; stars are
// sized against the person's own busiest month.

/** Goals finished in each month, Jan..Dec. */
export type MonthCounts = number[];

export type YearStars = {
  year: number;
  months: MonthCounts;
  /** A year that has ended always draws as a closed loop. */
  sealed: boolean;
};

export type RoleConstellation = {
  roleId: string;
  label: string;
  domain: string;
  /** This role's own busiest month across all its years (at least 1). */
  peak: number;
  /** Oldest first. */
  years: YearStars[];
};
