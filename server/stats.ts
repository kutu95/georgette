import type { PrismaClient } from "@prisma/client";
import { getPrisma, withDbRetry } from "./db.js";

export type StatsPayload = {
  sources: number;
  claims: number;
  evidenceLinks: number;
  observations: number;
  people: number;
  places: number;
  events: number;
  contradictions: number;
  topCategories: { name: string; count: number }[];
  tier1: {
    total: number;
    supported: number;
    underInvestigation: number;
    unresolved: number;
  };
  observationsQuality: {
    total: number;
    withoutClaims: number;
    claimsWithoutObservations: number;
  };
  shipReconstruction: {
    total: number;
    confirmed: number;
    probable: number;
    possible: number;
    rejected: number;
    criticalVisual: number;
    criticalWithoutEvidence: number;
  };
  warnings?: string[];
};

async function safeCount(
  warnings: string[],
  label: string,
  fn: (db: PrismaClient) => Promise<number>,
): Promise<number> {
  try {
    return await fn(getPrisma());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warnings.push(`${label}: ${message}`);
    return 0;
  }
}

export async function buildStats(): Promise<StatsPayload> {
  const warnings: string[] = [];

  return withDbRetry(async () => {
    const db = getPrisma();

    const [
      sources,
      claims,
      evidenceLinks,
      people,
      places,
      events,
      contradictions,
      observations,
      observationsWithoutClaims,
      claimsWithoutObservations,
      tier1Total,
      tier1Supported,
      tier1UnderInvestigation,
      tier1Unresolved,
      shipFeaturesTotal,
      shipFeaturesConfirmed,
      shipFeaturesProbable,
      shipFeaturesPossible,
      shipFeaturesRejected,
      shipFeaturesCritical,
      shipFeaturesCriticalWithoutEvidence,
    ] = await Promise.all([
      safeCount(warnings, "sources", (d) => d.source.count()),
      safeCount(warnings, "claims", (d) => d.claim.count()),
      safeCount(warnings, "evidenceLinks", (d) => d.evidenceLink.count()),
      safeCount(warnings, "people", (d) => d.person.count()),
      safeCount(warnings, "places", (d) => d.place.count()),
      safeCount(warnings, "events", (d) => d.event.count()),
      safeCount(warnings, "contradictions", (d) => d.contradiction.count()),
      safeCount(warnings, "observations", (d) => d.observation.count()),
      safeCount(warnings, "observationsWithoutClaims", (d) =>
        d.observation.count({ where: { claimLinks: { none: {} } } }),
      ),
      safeCount(warnings, "claimsWithoutObservations", (d) =>
        d.claim.count({ where: { observationLinks: { none: {} } } }),
      ),
      safeCount(warnings, "tier1.total", (d) =>
        d.claim.count({ where: { claimTier: "TIER_1" } }),
      ),
      safeCount(warnings, "tier1.supported", (d) =>
        d.claim.count({ where: { claimTier: "TIER_1", status: "SUPPORTED" } }),
      ),
      safeCount(warnings, "tier1.underInvestigation", (d) =>
        d.claim.count({
          where: { claimTier: "TIER_1", status: "UNDER_INVESTIGATION" },
        }),
      ),
      safeCount(warnings, "tier1.unresolved", (d) =>
        d.claim.count({ where: { claimTier: "TIER_1", status: "UNRESOLVED" } }),
      ),
      safeCount(warnings, "shipFeatures.total", (d) => d.shipFeature.count()),
      safeCount(warnings, "shipFeatures.confirmed", (d) =>
        d.shipFeature.count({ where: { status: "CONFIRMED" } }),
      ),
      safeCount(warnings, "shipFeatures.probable", (d) =>
        d.shipFeature.count({ where: { status: "PROBABLE" } }),
      ),
      safeCount(warnings, "shipFeatures.possible", (d) =>
        d.shipFeature.count({ where: { status: "POSSIBLE" } }),
      ),
      safeCount(warnings, "shipFeatures.rejected", (d) =>
        d.shipFeature.count({ where: { status: "REJECTED" } }),
      ),
      safeCount(warnings, "shipFeatures.criticalVisual", (d) =>
        d.shipFeature.count({ where: { visualImpact: "CRITICAL" } }),
      ),
      safeCount(warnings, "shipFeatures.criticalWithoutEvidence", (d) =>
        d.shipFeature.count({
          where: { visualImpact: "CRITICAL", observationLinks: { none: {} } },
        }),
      ),
    ]);

    let topCategories: { name: string; count: number }[] = [];
    try {
      const categoryRows = await db.source.groupBy({
        by: ["category"],
        where: { category: { not: null } },
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
        take: 10,
      });
      topCategories = categoryRows
        .filter((row) => row.category)
        .map((row) => ({
          name: row.category as string,
          count: row._count.category,
        }));
    } catch (err) {
      warnings.push(
        `topCategories: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const payload: StatsPayload = {
      sources,
      claims,
      evidenceLinks,
      observations,
      people,
      places,
      events,
      contradictions,
      topCategories,
      tier1: {
        total: tier1Total,
        supported: tier1Supported,
        underInvestigation: tier1UnderInvestigation,
        unresolved: tier1Unresolved,
      },
      observationsQuality: {
        total: observations,
        withoutClaims: observationsWithoutClaims,
        claimsWithoutObservations,
      },
      shipReconstruction: {
        total: shipFeaturesTotal,
        confirmed: shipFeaturesConfirmed,
        probable: shipFeaturesProbable,
        possible: shipFeaturesPossible,
        rejected: shipFeaturesRejected,
        criticalVisual: shipFeaturesCritical,
        criticalWithoutEvidence: shipFeaturesCriticalWithoutEvidence,
      },
    };

    if (warnings.length > 0) {
      payload.warnings = warnings;
    }

    return payload;
  });
}
