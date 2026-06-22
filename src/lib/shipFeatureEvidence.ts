import type { ObservationShipFeatureLinkRecord } from "./api";
import { isPrimarySource } from "./observationEvidence";

export type ShipFeatureObservationSummary = {
  total: number;
  supports: number;
  contradicts: number;
  qualifies: number;
};

export function summarizeShipFeatureLinks(
  links: ObservationShipFeatureLinkRecord[],
): ShipFeatureObservationSummary {
  const summary: ShipFeatureObservationSummary = {
    total: links.length,
    supports: 0,
    contradicts: 0,
    qualifies: 0,
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
    }
  }
  return summary;
}

export type ReconstructionConfidenceMetrics = {
  observationCount: number;
  uniqueSourceCount: number;
  primarySourceCount: number;
  secondarySourceCount: number;
  confidenceLabel: string;
};

export function assessReconstructionConfidence(
  links: ObservationShipFeatureLinkRecord[],
): ReconstructionConfidenceMetrics {
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

  let confidenceLabel: string;
  if (observationCount === 0) confidenceLabel = "Unknown";
  else if (observationCount === 1) confidenceLabel = "Weak";
  else if (observationCount <= 3) confidenceLabel = "Moderate";
  else if (observationCount <= 6) confidenceLabel = "Strong";
  else confidenceLabel = "Very Strong";

  return {
    observationCount,
    uniqueSourceCount: sourceIds.size,
    primarySourceCount,
    secondarySourceCount,
    confidenceLabel,
  };
}

export const SHIP_FEATURE_CATEGORIES = [
  { value: "HULL", label: "Hull" },
  { value: "RIGGING", label: "Rigging" },
  { value: "DECK_LAYOUT", label: "Deck Layout" },
  { value: "MACHINERY", label: "Machinery" },
  { value: "BOATS", label: "Boats" },
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "NAVIGATION", label: "Navigation" },
  { value: "CARGO_HANDLING", label: "Cargo Handling" },
  { value: "PAINTWORK", label: "Paintwork" },
  { value: "FITTINGS", label: "Fittings" },
  { value: "DIMENSIONS", label: "Dimensions" },
  { value: "OTHER", label: "Other" },
] as const;

export const SHIP_FEATURE_STATUSES = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROBABLE", label: "Probable" },
  { value: "POSSIBLE", label: "Possible" },
  { value: "REJECTED", label: "Rejected" },
  { value: "UNKNOWN", label: "Unknown" },
] as const;

export const SHIP_FEATURE_CONFIDENCES = [
  { value: "VERY_HIGH", label: "Very High" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "VERY_LOW", label: "Very Low" },
] as const;

export const VISUAL_IMPACTS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "MAJOR", label: "Major" },
  { value: "MINOR", label: "Minor" },
  { value: "HIDDEN", label: "Hidden" },
] as const;

export const SHIP_FEATURE_RELATIONSHIPS = [
  { value: "SUPPORTS", label: "Supports" },
  { value: "CONTRADICTS", label: "Contradicts" },
  { value: "QUALIFIES", label: "Qualifies" },
] as const;
