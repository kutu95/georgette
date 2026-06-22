-- Document types, page ordering, and grouping for multi-page sources
-- SAFE: additive only.

CREATE TYPE "georgette"."DocumentKind" AS ENUM (
  'PDF',
  'IMAGE',
  'DOCX',
  'TEXT',
  'OCR',
  'SUMMARY',
  'ORIGINAL',
  'COMBINED_OCR',
  'OTHER'
);

ALTER TABLE "georgette"."files"
  ADD COLUMN "document_kind" "georgette"."DocumentKind" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "page_number" INTEGER,
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "group_label" TEXT,
  ADD COLUMN "parent_file_id" TEXT;

ALTER TABLE "georgette"."files"
  ADD CONSTRAINT "files_parent_file_id_fkey"
  FOREIGN KEY ("parent_file_id") REFERENCES "georgette"."files"("file_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "files_source_id_document_kind_page_number_idx"
  ON "georgette"."files"("source_id", "document_kind", "page_number");
