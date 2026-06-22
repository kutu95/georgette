-- Ship reconstruction evidence module
-- SAFE: additive only.

CREATE TYPE "georgette"."ShipFeatureCategory" AS ENUM (
  'HULL',
  'RIGGING',
  'DECK_LAYOUT',
  'MACHINERY',
  'BOATS',
  'ACCOMMODATION',
  'NAVIGATION',
  'CARGO_HANDLING',
  'PAINTWORK',
  'FITTINGS',
  'DIMENSIONS',
  'OTHER'
);

CREATE TYPE "georgette"."ShipFeatureStatus" AS ENUM (
  'CONFIRMED',
  'PROBABLE',
  'POSSIBLE',
  'REJECTED',
  'UNKNOWN'
);

CREATE TYPE "georgette"."ShipFeatureConfidence" AS ENUM (
  'VERY_HIGH',
  'HIGH',
  'MEDIUM',
  'LOW',
  'VERY_LOW'
);

CREATE TYPE "georgette"."VisualImpact" AS ENUM (
  'CRITICAL',
  'MAJOR',
  'MINOR',
  'HIDDEN'
);

CREATE TYPE "georgette"."ShipFeatureRelationship" AS ENUM (
  'SUPPORTS',
  'CONTRADICTS',
  'QUALIFIES'
);

ALTER TYPE "georgette"."EntityType" ADD VALUE IF NOT EXISTS 'SHIP_FEATURE';

CREATE TABLE "georgette"."ship_features" (
    "feature_id" TEXT NOT NULL,
    "feature_name" TEXT NOT NULL,
    "category" "georgette"."ShipFeatureCategory" NOT NULL,
    "description" TEXT,
    "status" "georgette"."ShipFeatureStatus" NOT NULL DEFAULT 'POSSIBLE',
    "confidence" "georgette"."ShipFeatureConfidence" NOT NULL DEFAULT 'MEDIUM',
    "visual_impact" "georgette"."VisualImpact" NOT NULL DEFAULT 'MINOR',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ship_features_pkey" PRIMARY KEY ("feature_id")
);

CREATE TABLE "georgette"."observation_ship_feature_links" (
    "link_id" TEXT NOT NULL,
    "observation_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "relationship_type" "georgette"."ShipFeatureRelationship" NOT NULL DEFAULT 'SUPPORTS',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observation_ship_feature_links_pkey" PRIMARY KEY ("link_id")
);

CREATE UNIQUE INDEX "observation_ship_feature_links_observation_id_feature_id_key"
    ON "georgette"."observation_ship_feature_links"("observation_id", "feature_id");

ALTER TABLE "georgette"."observation_ship_feature_links"
    ADD CONSTRAINT "observation_ship_feature_links_observation_id_fkey"
    FOREIGN KEY ("observation_id") REFERENCES "georgette"."observations"("observation_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "georgette"."observation_ship_feature_links"
    ADD CONSTRAINT "observation_ship_feature_links_feature_id_fkey"
    FOREIGN KEY ("feature_id") REFERENCES "georgette"."ship_features"("feature_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
