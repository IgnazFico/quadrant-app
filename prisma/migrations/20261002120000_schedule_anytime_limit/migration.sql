-- At most 2 "Anytime" schedule blocks (isPriority, no hour) per user per day.
-- The API checks first (lib/scheduleGoal.ts anytimeDayFull) and returns a
-- friendly 409; this trigger is the safety net for concurrent requests.
-- The limit (2) mirrors ANYTIME_PER_DAY in lib/scheduleRules.ts.
--
-- Existing days already over the limit are left alone (no rows changed).
-- The trigger only fires when a block TAKES a slot: inserted as Anytime,
-- turned into Anytime, or an Anytime block moved to another day. Editing or
-- removing blocks on an over-limit day keeps working.

CREATE OR REPLACE FUNCTION schedule_blocks_anytime_limit() RETURNS trigger AS $$
DECLARE
  uid text;
  n   int;
BEGIN
  IF NOT NEW."isPriority" THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."isPriority" AND OLD."day" = NEW."day" THEN
    RETURN NEW;
  END IF;

  SELECT "userId" INTO uid FROM "roles" WHERE "id" = NEW."roleId";
  -- Serialise concurrent writers for the same user+day.
  PERFORM pg_advisory_xact_lock(hashtext('anytime:' || uid || ':' || NEW."day"::text));

  SELECT COUNT(*) INTO n
  FROM "schedule_blocks" b
  JOIN "roles" r ON r."id" = b."roleId"
  WHERE r."userId" = uid
    AND b."day" = NEW."day"
    AND b."isPriority"
    AND b."id" <> NEW."id";

  IF n >= 2 THEN
    RAISE EXCEPTION 'ANYTIME_LIMIT_REACHED: at most 2 Anytime blocks per day'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "schedule_blocks_anytime_limit" ON "schedule_blocks";
CREATE TRIGGER "schedule_blocks_anytime_limit"
  BEFORE INSERT OR UPDATE ON "schedule_blocks"
  FOR EACH ROW EXECUTE FUNCTION schedule_blocks_anytime_limit();
