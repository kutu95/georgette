-- Observations layer: factual statements extracted from sources
-- SAFE: additive only. No DROP TABLE or TRUNCATE.

CREATE TYPE "georgette"."ObservationConfidence" AS ENUM (
  'CERTAIN',
  'LIKELY',
  'POSSIBLE',
  'UNCERTAIN'
);

ALTER TYPE "georgette"."EntityType" ADD VALUE IF NOT EXISTS 'OBSERVATION';

CREATE TABLE "georgette"."observations" (
    "observation_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "observation_text" TEXT NOT NULL,
    "page_or_folio" TEXT,
    "quote" TEXT,
    "notes" TEXT,
    "confidence" "georgette"."ObservationConfidence" NOT NULL DEFAULT 'LIKELY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("observation_id")
);

CREATE TABLE "georgette"."observation_claim_links" (
    "link_id" TEXT NOT NULL,
    "observation_id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "relationship_type" "georgette"."EvidenceRelationship" NOT NULL DEFAULT 'SUPPORTS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observation_claim_links_pkey" PRIMARY KEY ("link_id")
);

CREATE UNIQUE INDEX "observation_claim_links_observation_id_claim_id_key"
    ON "georgette"."observation_claim_links"("observation_id", "claim_id");

ALTER TABLE "georgette"."observations"
    ADD CONSTRAINT "observations_source_id_fkey"
    FOREIGN KEY ("source_id") REFERENCES "georgette"."sources"("source_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "georgette"."observation_claim_links"
    ADD CONSTRAINT "observation_claim_links_observation_id_fkey"
    FOREIGN KEY ("observation_id") REFERENCES "georgette"."observations"("observation_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "georgette"."observation_claim_links"
    ADD CONSTRAINT "observation_claim_links_claim_id_fkey"
    FOREIGN KEY ("claim_id") REFERENCES "georgette"."claims"("claim_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
