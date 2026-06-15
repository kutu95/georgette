-- Georgette schema initial migration
-- SAFE: additive only. No DROP, TRUNCATE, DELETE, or schema reset.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "georgette";

-- CreateEnum
CREATE TYPE "georgette"."EntityType" AS ENUM ('SOURCE', 'CLAIM', 'PERSON', 'PLACE', 'EVENT', 'CONTRADICTION', 'MANUSCRIPT_REFERENCE', 'TAG', 'EVIDENCE_LINK', 'FILE');

-- CreateEnum
CREATE TYPE "georgette"."RelationshipType" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'QUALIFIES', 'MENTIONS', 'DERIVED_FROM', 'AUTHOR_OF', 'WITNESS_TO', 'PARTICIPATED_IN', 'RESCUED', 'RESCUED_BY', 'CAPTAIN_OF', 'CREW_OF', 'PASSENGER_ON', 'OCCURRED_AT', 'OCCURRED_BEFORE', 'OCCURRED_AFTER', 'ABOUT', 'REFERENCED_IN', 'LOCATED_AT', 'PART_OF', 'RELATED_TO');

-- CreateEnum
CREATE TYPE "georgette"."ClaimStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISPUTED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "georgette"."ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "georgette"."EvidenceRelationship" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'QUALIFIES', 'MENTIONS');

-- CreateTable
CREATE TABLE "georgette"."sources" (
    "source_id" TEXT NOT NULL,
    "current_file_name" TEXT,
    "suggested_standard_file_name" TEXT,
    "document_type" TEXT,
    "category" TEXT,
    "original_or_derived" TEXT,
    "importance" TEXT,
    "notes" TEXT,
    "parent_source_id" TEXT,
    "source_level" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("source_id")
);

-- CreateTable
CREATE TABLE "georgette"."files" (
    "file_id" TEXT NOT NULL,
    "source_id" TEXT,
    "file_path" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "georgette"."claims" (
    "claim_id" TEXT NOT NULL,
    "claim_text" TEXT NOT NULL,
    "topic" TEXT,
    "status" "georgette"."ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "confidence" "georgette"."ConfidenceLevel" NOT NULL DEFAULT 'LOW',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("claim_id")
);

-- CreateTable
CREATE TABLE "georgette"."evidence_links" (
    "evidence_id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "relationship" "georgette"."EvidenceRelationship" NOT NULL DEFAULT 'SUPPORTS',
    "page_or_folio" TEXT,
    "quote" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_links_pkey" PRIMARY KEY ("evidence_id")
);

-- CreateTable
CREATE TABLE "georgette"."people" (
    "person_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TEXT,
    "death_date" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("person_id")
);

-- CreateTable
CREATE TABLE "georgette"."places" (
    "place_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "place_type" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("place_id")
);

-- CreateTable
CREATE TABLE "georgette"."events" (
    "event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "event_date" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "georgette"."contradictions" (
    "contradiction_id" TEXT NOT NULL,
    "claim_a_id" TEXT NOT NULL,
    "claim_b_id" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'open',
    "resolution_notes" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contradictions_pkey" PRIMARY KEY ("contradiction_id")
);

-- CreateTable
CREATE TABLE "georgette"."manuscript_references" (
    "manuscript_ref_id" TEXT NOT NULL,
    "reference_text" TEXT,
    "manuscript_location" TEXT,
    "page" TEXT,
    "claim_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manuscript_references_pkey" PRIMARY KEY ("manuscript_ref_id")
);

-- CreateTable
CREATE TABLE "georgette"."tags" (
    "tag_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "georgette"."relationships" (
    "relationship_id" TEXT NOT NULL,
    "from_entity_type" "georgette"."EntityType" NOT NULL,
    "from_entity_id" TEXT NOT NULL,
    "relationship_type" "georgette"."RelationshipType" NOT NULL,
    "to_entity_type" "georgette"."EntityType" NOT NULL,
    "to_entity_id" TEXT NOT NULL,
    "confidence" "georgette"."ConfidenceLevel",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("relationship_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "georgette"."tags"("name");

-- CreateIndex
CREATE INDEX "relationships_from_entity_type_from_entity_id_idx" ON "georgette"."relationships"("from_entity_type", "from_entity_id");

-- CreateIndex
CREATE INDEX "relationships_to_entity_type_to_entity_id_idx" ON "georgette"."relationships"("to_entity_type", "to_entity_id");

-- AddForeignKey
ALTER TABLE "georgette"."sources" ADD CONSTRAINT "sources_parent_source_id_fkey" FOREIGN KEY ("parent_source_id") REFERENCES "georgette"."sources"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georgette"."files" ADD CONSTRAINT "files_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "georgette"."sources"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georgette"."evidence_links" ADD CONSTRAINT "evidence_links_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "georgette"."claims"("claim_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georgette"."evidence_links" ADD CONSTRAINT "evidence_links_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "georgette"."sources"("source_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georgette"."contradictions" ADD CONSTRAINT "contradictions_claim_a_id_fkey" FOREIGN KEY ("claim_a_id") REFERENCES "georgette"."claims"("claim_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georgette"."contradictions" ADD CONSTRAINT "contradictions_claim_b_id_fkey" FOREIGN KEY ("claim_b_id") REFERENCES "georgette"."claims"("claim_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "georgette"."manuscript_references" ADD CONSTRAINT "manuscript_references_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "georgette"."claims"("claim_id") ON DELETE SET NULL ON UPDATE CASCADE;
