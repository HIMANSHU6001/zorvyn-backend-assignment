-- Empty database path: apply schema-only changes for relation-based categories.
ALTER TABLE "financial_records"
  ALTER COLUMN "categoryId" SET NOT NULL;

-- Replace legacy FK behavior (SET NULL) with RESTRICT now that categoryId is required.
ALTER TABLE "financial_records"
  DROP CONSTRAINT "financial_records_categoryId_fkey";

ALTER TABLE "financial_records"
  ADD CONSTRAINT "financial_records_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop legacy string category artifacts.
DROP INDEX IF EXISTS "financial_records_category_idx";

ALTER TABLE "financial_records"
  DROP COLUMN "category";
