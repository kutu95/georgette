-- Claim tier system, historian workflow fields, updated status values
-- SAFE: additive columns + enum migration with data mapping. No DROP TABLE or TRUNCATE.

-- New enums
CREATE TYPE "georgette"."ClaimTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- Replace ClaimStatus with historian workflow values
CREATE TYPE "georgette"."ClaimStatus_new" AS ENUM (
  'DRAFT',
  'UNDER_INVESTIGATION',
  'SUPPORTED',
  'PARTIALLY_SUPPORTED',
  'CONTRADICTED',
  'UNRESOLVED'
);

ALTER TABLE "georgette"."claims"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "georgette"."claims"
  ALTER COLUMN "status" TYPE "georgette"."ClaimStatus_new"
  USING (
    CASE "status"::text
      WHEN 'DRAFT' THEN 'DRAFT'::"georgette"."ClaimStatus_new"
      WHEN 'ACTIVE' THEN 'SUPPORTED'::"georgette"."ClaimStatus_new"
      WHEN 'DISPUTED' THEN 'CONTRADICTED'::"georgette"."ClaimStatus_new"
      WHEN 'SUPERSEDED' THEN 'UNRESOLVED'::"georgette"."ClaimStatus_new"
      WHEN 'ARCHIVED' THEN 'UNRESOLVED'::"georgette"."ClaimStatus_new"
      ELSE 'DRAFT'::"georgette"."ClaimStatus_new"
    END
  );

DROP TYPE "georgette"."ClaimStatus";
ALTER TYPE "georgette"."ClaimStatus_new" RENAME TO "ClaimStatus";

ALTER TABLE "georgette"."claims"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Add UNKNOWN to confidence
ALTER TYPE "georgette"."ConfidenceLevel" ADD VALUE IF NOT EXISTS 'UNKNOWN';
-- New claim columns
ALTER TABLE "georgette"."claims"
  ADD COLUMN "claim_tier" "georgette"."ClaimTier" NOT NULL DEFAULT 'TIER_2',
  ADD COLUMN "evidence_requirements" TEXT,
  ADD COLUMN "research_questions" TEXT;
