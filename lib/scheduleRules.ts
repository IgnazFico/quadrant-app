/**
 * Schedule rules shared by the client (to explain/prevent) and the server
 * (to enforce). Pure — safe to import from client components.
 */

/**
 * Most "Anytime" items (schedule blocks with no hour, isPriority = true) a
 * user can have on one day. Anytime is a commitment without a time; capping
 * it pushes the rest of the day's plan into real, timed slots.
 *
 * Also hard-coded in the DB trigger from migration
 * 20261002120000_schedule_anytime_limit — change both together.
 */
export const ANYTIME_PER_DAY = 2;

/** Shown as a toast (components/toast/Toaster.tsx), so keep it short. */
export const ANYTIME_LIMIT_MESSAGE = `Max ${ANYTIME_PER_DAY} Anytime items per day`;

/** `code` on the API's 409 body when the limit is hit. */
export const ANYTIME_LIMIT_REACHED = "ANYTIME_LIMIT_REACHED";
