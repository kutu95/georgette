import { isTextViewableDocument } from "./normalizeDisplayText";

export type DocumentViewMode = "text" | "pdf" | "image" | "unsupported";

export type ViewableDocument = {
  fileId: string;
  fileName: string | null;
  mimeType: string | null;
  documentKind: string;
};

export function getDocumentViewMode(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
  documentKind?: string,
): DocumentViewMode {
  const mime = mimeType ?? "";
  const lower = (fileName ?? "").toLowerCase();

  if (documentKind === "PDF" || mime === "application/pdf" || lower.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    documentKind === "IMAGE" ||
    mime.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff"].some((ext) =>
      lower.endsWith(ext),
    )
  ) {
    return "image";
  }
  if (isTextViewableDocument(mimeType, fileName, documentKind)) {
    return "text";
  }
  return "unsupported";
}
