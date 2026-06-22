export type ClaimSummary = {
  claimId: string;
  claimText: string;
  topic?: string | null;
  status?: string;
  confidence?: string;
};

export type SourceSummary = {
  sourceId: string;
  currentFileName?: string | null;
  suggestedStandardFileName?: string | null;
  documentType?: string | null;
  category?: string | null;
  importance?: string | null;
  originalOrDerived?: string | null;
  notes?: string | null;
};

export function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function formatClaimLabel(claim: Pick<ClaimSummary, "claimId" | "claimText">): string {
  return `${claim.claimId} — ${truncate(claim.claimText)}`;
}

export function formatSourceLabel(
  source: Pick<SourceSummary, "sourceId" | "suggestedStandardFileName" | "currentFileName">,
): string {
  const name = source.suggestedStandardFileName || source.currentFileName || "Untitled";
  return `${source.sourceId} — ${name}`;
}

export function formatClaimStatus(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    UNDER_INVESTIGATION: "Under Investigation",
    SUPPORTED: "Supported",
    PARTIALLY_SUPPORTED: "Partially Supported",
    CONTRADICTED: "Contradicted",
    UNRESOLVED: "Unresolved",
  };
  return status ? (labels[status] ?? status) : "—";
}

export function formatClaimTier(tier: string | null | undefined): string {
  const labels: Record<string, string> = {
    TIER_1: "Tier 1",
    TIER_2: "Tier 2",
    TIER_3: "Tier 3",
  };
  return tier ? (labels[tier] ?? tier) : "—";
}

export function formatConfidence(confidence: string | null | undefined): string {
  if (!confidence) return "—";
  if (confidence === "UNKNOWN") return "Unknown";
  return confidence.charAt(0) + confidence.slice(1).toLowerCase();
}

export function formatRelationship(relationship: string): string {
  return relationship.charAt(0) + relationship.slice(1).toLowerCase();
}

export function formatObservationConfidence(confidence: string | null | undefined): string {
  const labels: Record<string, string> = {
    CERTAIN: "Certain",
    LIKELY: "Likely",
    POSSIBLE: "Possible",
    UNCERTAIN: "Uncertain",
  };
  return confidence ? (labels[confidence] ?? confidence) : "—";
}

export function formatEnumLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatShipFeatureCategory(category: string | null | undefined): string {
  if (category === "DECK_LAYOUT") return "Deck Layout";
  if (category === "CARGO_HANDLING") return "Cargo Handling";
  return formatEnumLabel(category);
}

export function formatShipFeatureStatus(status: string | null | undefined): string {
  return formatEnumLabel(status);
}

export function formatShipFeatureConfidence(confidence: string | null | undefined): string {
  return formatEnumLabel(confidence);
}

export function formatVisualImpact(impact: string | null | undefined): string {
  return formatEnumLabel(impact);
}

export function truncateCell(text: string | null | undefined, max = 60): string {
  if (!text) return "—";
  return truncate(text, max);
}

export function formatDocumentKind(
  documentKind: string | null | undefined,
  mimeType?: string | null,
): string {
  if (documentKind && documentKind !== "OTHER") {
    const labels: Record<string, string> = {
      PDF: "PDF",
      IMAGE: "Image / scan",
      DOCX: "Word document",
      TEXT: "Plain text",
      OCR: "OCR text",
      SUMMARY: "Summary",
      ORIGINAL: "Original",
      COMBINED_OCR: "Combined OCR",
      OTHER: "Other",
    };
    return labels[documentKind] ?? documentKind;
  }
  if (!mimeType) return "Document";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("text/")) return "Text";
  if (mimeType.includes("word")) return "Word document";
  return "Document";
}

export function formatPageLabel(pageNumber: number | null | undefined): string {
  if (pageNumber == null) return "";
  return `Page ${pageNumber}`;
}
