-- WO-035 (D-085): mission_statements.signedName is sealed in the browser.
--
--   mission_statements.signedName  TEXT -> BYTEA
--
-- LEGACY ROWS: the old text becomes its UTF-8 bytes (nothing is deleted). Those
-- bytes are NOT ciphertext; the app cannot open them and shows an empty name
-- (see hooks/useProfile.ts). The server has no key, so it cannot seal them.
-- Existing rows are handled as in WO-030 (owner choice A/B/C, D-077): either
-- the user re-signs (a new version is sealed) or the old row is deleted.
-- THIS FILE IS NOT RUN ON PRODUCTION by WO-035. Apply after 20261028090000.
--
-- Rollback: ALTER COLUMN ... TYPE TEXT USING convert_from(col, 'UTF8') (sealed
-- rows would turn into garbage text; after real use, restore from backup).

ALTER TABLE "mission_statements"
  ALTER COLUMN "signedName" TYPE BYTEA USING convert_to("signedName", 'UTF8');
