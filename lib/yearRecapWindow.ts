/**
 * True from December 20 through December 31 (inclusive), for the given date.
 *
 * Without `timeZone` it reads the runtime's local calendar (the browser's, for
 * the Profile button and the recap prompt). With an IANA `timeZone` it reads
 * that zone's calendar; the server uses this (see below).
 */
export function isRecapWindowOpen(date: Date = new Date(), timeZone?: string): boolean {
  if (!timeZone) return date.getMonth() === 11 && date.getDate() >= 20;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return month === 12 && day >= 20;
}

/**
 * The zone the server uses for the window. A server has no viewer and its own
 * zone is UTC on Vercel, so the zone is pinned (D-039 C, WO-033).
 */
export const RECAP_SERVER_TIME_ZONE = "Asia/Jakarta";

/** True when the year review may be opened right now, by the server's clock. */
export function isRecapWindowOpenOnServer(now: Date = new Date()): boolean {
  return isRecapWindowOpen(now, RECAP_SERVER_TIME_ZONE);
}
