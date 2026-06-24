/** Display-only cleanup — never write this back to stored documents. */
export function normalizeDisplayText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n");
}

export function isTextViewableDocument(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
  documentKind?: string,
): boolean {
  if (documentKind === "TEXT" || documentKind === "OCR" || documentKind === "SUMMARY") {
    return true;
  }
  const mime = mimeType ?? "";
  if (mime.startsWith("text/")) return true;
  const lower = (fileName ?? "").toLowerCase();
  return lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown");
}
