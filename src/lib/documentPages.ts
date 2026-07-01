type PageableDocument = {
  documentKind: string;
  pageNumber: number | null;
  groupLabel: string | null;
};

const PAGE_SCAN_KINDS = new Set(["IMAGE", "ORIGINAL"]);

export function normalizeGroupLabel(groupLabel: string | null | undefined): string {
  return groupLabel?.trim() ?? "";
}

/** Next page number for scans/OCR within an optional group. */
export function nextPageNumber(
  documents: PageableDocument[],
  options: {
    kinds?: string[];
    groupLabel?: string;
  } = {},
): number {
  const kinds = new Set(options.kinds ?? ["IMAGE", "ORIGINAL", "OCR"]);
  const group = normalizeGroupLabel(options.groupLabel);

  const pages = documents
    .filter((doc) => kinds.has(doc.documentKind))
    .filter((doc) => normalizeGroupLabel(doc.groupLabel) === group)
    .map((doc) => doc.pageNumber)
    .filter((page): page is number => page != null && page >= 1);

  if (pages.length === 0) return 1;
  return Math.max(...pages) + 1;
}

export function isPageScanKind(documentKind: string): boolean {
  return PAGE_SCAN_KINDS.has(documentKind);
}
