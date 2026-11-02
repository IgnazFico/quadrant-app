-- WO-029 (D-066): goal titles, schedule entry titles and role labels are sealed
-- in the browser, so the server stores bytes it cannot read.
--
--   goals.title            TEXT -> BYTEA
--   schedule_blocks.title  TEXT -> BYTEA
--   roles.label            TEXT -> BYTEA
--
-- plus two small columns that let the server keep two features without ever
-- reading those values:
--   goals.carriedFromId            idempotent carry-forward (UNIQUE)
--   growth_rings.milestoneNotified role-milestone notice dedupe
--
-- ORDER WITH PR #5 (WO-012, 20261027090000_email_otp): the two migrations touch
-- different tables and do not depend on each other. This one is named after
-- it so a database that has both applies them in this order; either order
-- works with `prisma migrate deploy`.
--
-- LEGACY ROWS. The USING clauses keep every existing row (nothing is deleted
-- or rewritten): the old text becomes its UTF-8 bytes. Those bytes are NOT
-- ciphertext. The app cannot open them (no valid nonce and MAC) and shows a
-- fixed placeholder instead of crashing. The server cannot seal them (it has
-- no key), so what happens to legacy rows on production is decided in WO-030;
-- this file does not run on production.
--
-- Reversible by hand: ALTER COLUMN ... TYPE TEXT USING convert_from(col, 'UTF8')
-- turns legacy rows back into text but makes sealed rows unreadable bytes-as-text,
-- so rollback after real use means restoring from backup. See the build report.

ALTER TABLE "roles"
  ALTER COLUMN "label" TYPE BYTEA USING convert_to("label", 'UTF8');

ALTER TABLE "goals"
  ALTER COLUMN "title" TYPE BYTEA USING convert_to("title", 'UTF8');

ALTER TABLE "schedule_blocks"
  ALTER COLUMN "title" TYPE BYTEA USING convert_to("title", 'UTF8');

-- Carry-forward: each carried goal remembers its source goal.
ALTER TABLE "goals" ADD COLUMN "carriedFromId" TEXT;

CREATE UNIQUE INDEX "goals_carriedFromId_key" ON "goals"("carriedFromId");

ALTER TABLE "goals"
  ADD CONSTRAINT "goals_carriedFromId_fkey"
  FOREIGN KEY ("carriedFromId") REFERENCES "goals"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Role milestone notice: highest tier already announced for the role-year.
-- Backfill: a ring that is already past a tier is treated as announced, so the
-- first run after this change cannot send a second notice for it. (Cost: a tier
-- reached but never announced before this change is not announced.)
ALTER TABLE "growth_rings" ADD COLUMN "milestoneNotified" INTEGER NOT NULL DEFAULT 0;

UPDATE "growth_rings"
   SET "milestoneNotified" = ("votesLogged" / 25) * 25
 WHERE "votesLogged" >= 25;
