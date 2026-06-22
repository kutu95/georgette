import type { ObservationClaimLinkRecord } from "./api";

const PRIMARY_SOURCE_VALUES = new Set([
  "original",
  "primary",
  "primary source",
]);

export function isPrimarySource(originalOrDerived: string | null | undefined): boolean {
  if (!originalOrDerived) return false;
  return PRIMARY_SOURCE_VALUES.has(originalOrDerived.trim().toLowerCase());
}

export type ObservationSummary = {
  total: number;
  supports: number;
  contradicts: number;
  qualifies: number;
  mentions: number;
};

export function summarizeObservationLinks(
  links: ObservationClaimLinkRecord[],
): ObservationSummary {
  const summary: ObservationSummary = {
    total: links.length,
    supports: 0,
    contradicts: 0,
    qualifies: 0,
    mentions: 0,
  };
  for (const link of links) {
    switch (link.relationshipType) {
      case "SUPPORTS":
        summary.supports++;
        break;
      case "CONTRADICTS":
        summary.contradicts++;
        break;
      case "QUALIFIES":
        summary.qualifies++;
        break;
      case "MENTIONS":
        summary.mentions++;
        break;
    }
  }
  return summary;
}

export type EvidenceStrengthMetrics = {
  observationCount: number;
  uniqueSourceCount: number;
  primarySourceCount: number;
  secondarySourceCount: number;
  strengthLabel: string;
};

export function assessEvidenceStrength(
  links: ObservationClaimLinkRecord[],
): EvidenceStrengthMetrics {
  const observationCount = links.length;
  const sourceIds = new Set<string>();
  let primarySourceCount = 0;
  let secondarySourceCount = 0;

  for (const link of links) {
    const source = link.observation?.source;
    if (!source?.sourceId || sourceIds.has(source.sourceId)) continue;
    sourceIds.add(source.sourceId);
    if (isPrimarySource(source.originalOrDerived)) {
      primarySourceCount++;
    } else {
      secondarySourceCount++;
    }
  }

  let strengthLabel: string;
  if (observationCount === 0) strengthLabel = "None";
  else if (observationCount <= 2) strengthLabel = "Weak";
  else if (observationCount <= 5) strengthLabel = "Moderate";
  else if (observationCount <= 10) strengthLabel = "Strong";
  else strengthLabel = "Very Strong";

  return {
    observationCount,
    uniqueSourceCount: sourceIds.size,
    primarySourceCount,
    secondarySourceCount,
    strengthLabel,
  };
}

export const OBSERVATION_RELATIONSHIPS = [
  { value: "SUPPORTS", label: "Supports" },
  { value: "CONTRADICTS", label: "Contradicts" },
  { value: "QUALIFIES", label: "Qualifies" },
  { value: "MENTIONS", label: "Mentions" },
] as const;
