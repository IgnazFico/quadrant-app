/** True from December 20 through December 31 (inclusive), for the given date. */
export function isRecapWindowOpen(date: Date = new Date()): boolean {
  return date.getMonth() === 11 && date.getDate() >= 20;
}
