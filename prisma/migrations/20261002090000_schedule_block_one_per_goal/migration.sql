-- A goal can be scheduled in exactly one place. Moving it changes that
-- block's day/hour (PATCH /api/schedule/[id]); it never gets a second block.
--
-- Existing duplicates: keep the goal linked to its earliest-created block.
-- The later ones are kept as standalone blocks (goalId -> NULL, title
-- unchanged) rather than deleted, so nothing the user wrote disappears.
UPDATE "schedule_blocks" AS b
SET "goalId" = NULL
WHERE b."goalId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "schedule_blocks" AS o
    WHERE o."goalId" = b."goalId"
      AND (o."createdAt" < b."createdAt"
           OR (o."createdAt" = b."createdAt" AND o."id" < b."id"))
  );

-- CreateIndex
CREATE UNIQUE INDEX "schedule_blocks_goalId_key" ON "schedule_blocks"("goalId");
