/** Returns midnight UTC of the Monday for the given date's week. */
export function startOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon = 0 ... Sun = 6
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfDay(d: Date = new Date()): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}
