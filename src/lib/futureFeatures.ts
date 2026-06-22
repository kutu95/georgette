/**
 * Future feature hooks — architecture placeholders only.
 * Not implemented in v1. Extend these interfaces when building each feature.
 */

/** Link manuscript passages to claims (bidirectional). */
export type ManuscriptClaimLink = {
  manuscriptRefId: string;
  claimId: string;
  passageText: string;
  chapterOrSection?: string;
};

/** Extract candidate claims from manuscript text (manual review queue, no AI in v1). */
export type ClaimExtractionCandidate = {
  draftText: string;
  sourceManuscriptRefId: string;
  status: "pending" | "accepted" | "rejected";
};

/** Automated contradiction detection between claims (rule-based first, not AI). */
export type ContradictionAnalysis = {
  claimAId: string;
  claimBId: string;
  detectedBy: "manual" | "rule";
  severity: "low" | "medium" | "high";
};

/** Timeline visualisation data shape. */
export type TimelineNode = {
  eventId: string;
  claimIds: string[];
  sortDate: string;
};

/** Knowledge graph node for relationship visualisation. */
export type GraphNode = {
  entityType: string;
  entityId: string;
  label: string;
};

export type GraphEdge = {
  from: GraphNode;
  to: GraphNode;
  relationshipType: string;
};

/** Create observation pre-filled from selected claim text (future — not implemented). */
export type ObservationFromClaimTextDraft = {
  claimId: string;
  highlightedText: string;
  suggestedObservationText?: string;
};

export const FUTURE_FEATURES = [
  "manuscript-to-claim linking",
  "claim extraction from manuscript",
  "observation-from-highlighted-claim-text",
  "contradiction analysis",
  "timeline visualisation",
  "knowledge graph visualisation",
] as const;
