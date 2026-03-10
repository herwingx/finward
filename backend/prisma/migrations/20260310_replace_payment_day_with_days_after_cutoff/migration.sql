-- Credit cards migration: replace fixed payment day with natural days after cutoff.
-- Strategy:
-- 1) Add new field with default fallback value for existing rows.
-- 2) Backfill only credit accounts that had paymentDay configured.
-- 3) Drop legacy field.

ALTER TABLE "Account"
ADD COLUMN IF NOT EXISTS "daysToPayAfterCutoff" INTEGER;

UPDATE "Account"
SET "daysToPayAfterCutoff" = 20
WHERE "type" = 'CREDIT'
  AND "daysToPayAfterCutoff" IS NULL;

ALTER TABLE "Account"
DROP COLUMN IF EXISTS "paymentDay";
