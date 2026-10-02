-- Goal.weekStart must be the Monday of its week. Every week-based query in the
-- app compares weekStart for equality against startOfWeek() (a Monday), so a
-- goal stored on any other day belongs to a week nothing can ever fetch.
--
-- Old local-time week math (lib/week.ts before a72992d) run in a UTC+ process
-- (e.g. a local script or dev server pointed at this database) stored local
-- midnight Monday, which is the previous day in UTC, so those rows landed on
-- the Sunday BEFORE their intended Monday. That is why the repair is +1 day,
-- not date_trunc('week') (which would push them a whole week back).
--
-- An unresolved goal on a non-Monday week made the weekly review gate
-- unsatisfiable: the gate found the raw week, GET /api/review?weekStart= and
-- POST /api/review/complete snapped it to a Monday that had no goals, so the
-- user could never clear it and was redirected back to /weekly-review forever.

-- 1. Repair: Sunday rows move forward to the Monday they were meant for.
UPDATE "goals"
SET "weekStart" = "weekStart" + 1
WHERE EXTRACT(ISODOW FROM "weekStart") = 7;

-- 2. Anything else that is still not a Monday snaps back to its ISO week's Monday.
UPDATE "goals"
SET "weekStart" = date_trunc('week', "weekStart")::date
WHERE EXTRACT(ISODOW FROM "weekStart") <> 1;

-- 3. Enforce it, so a future bad writer fails loudly instead of silently
--    creating a week the review flow cannot reach.
ALTER TABLE "goals"
ADD CONSTRAINT "goals_weekStart_is_monday" CHECK (EXTRACT(ISODOW FROM "weekStart") = 1);
