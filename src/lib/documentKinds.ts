export const DOCUMENT_KINDS = [
  { value: "PDF", label: "PDF" },
  { value: "IMAGE", label: "Image / scan" },
  { value: "DOCX", label: "Word document" },
  { value: "TEXT", label: "Plain text" },
  { value: "OCR", label: "OCR text (page)" },
  { value: "SUMMARY", label: "Summary / context" },
  { value: "ORIGINAL", label: "Original document" },
  { value: "COMBINED_OCR", label: "Combined OCR (auto)" },
  { value: "OTHER", label: "Other" },
] as const;

export type DocumentKindValue = (typeof DOCUMENT_KINDS)[number]["value"];

export const DOCUMENT_KIND_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_KINDS.map((k) => [k.value, k.label]),
);

/** Kinds available when uploading — excludes auto-generated combined OCR. */
export const UPLOAD_DOCUMENT_KINDS = DOCUMENT_KINDS.filter(
  (k) => k.value !== "COMBINED_OCR" && k.value !== "OTHER",
);

export function groupDocumentsByLabel<T extends { groupLabel: string | null; documentKind: string }>(
  documents: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const doc of documents) {
    const key = doc.groupLabel?.trim() || `_ungrouped_${doc.documentKind}`;
    const list = groups.get(key) ?? [];
    list.push(doc);
    groups.set(key, list);
  }
  return groups;
}
