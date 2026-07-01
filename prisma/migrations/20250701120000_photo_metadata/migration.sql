-- Photo metadata on document files (additive only).

ALTER TABLE "georgette"."files"
  ADD COLUMN "photographer" TEXT,
  ADD COLUMN "photo_date" TEXT,
  ADD COLUMN "photo_location" TEXT,
  ADD COLUMN "copyright_holder" TEXT;
