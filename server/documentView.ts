import type { DocumentKind, File } from "@prisma/client";

const KIND_PRIORITY: DocumentKind[] = [
  "ORIGINAL",
  "PDF",
  "IMAGE",
  "TEXT",
  "OCR",
  "SUMMARY",
  "DOCX",
  "OTHER",
];

type FilePick = Pick<
  File,
  "fileId" | "fileName" | "mimeType" | "documentKind" | "pageNumber" | "createdAt" | "filePath"
>;

export type PrimaryDocumentSummary = {
  fileId: string;
  fileName: string | null;
  mimeType: string | null;
  documentKind: DocumentKind;
};

export function pickPrimaryDocument(files: FilePick[]): PrimaryDocumentSummary | null {
  const eligible = files.filter((file) => file.filePath && file.documentKind !== "COMBINED_OCR");
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => {
    const kindA = KIND_PRIORITY.indexOf(a.documentKind);
    const kindB = KIND_PRIORITY.indexOf(b.documentKind);
    const priorityA = kindA === -1 ? KIND_PRIORITY.length : kindA;
    const priorityB = kindB === -1 ? KIND_PRIORITY.length : kindB;
    if (priorityA !== priorityB) return priorityA - priorityB;

    const pageA = a.pageNumber ?? Number.MAX_SAFE_INTEGER;
    const pageB = b.pageNumber ?? Number.MAX_SAFE_INTEGER;
    if (pageA !== pageB) return pageA - pageB;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const doc = sorted[0];
  return {
    fileId: doc.fileId,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    documentKind: doc.documentKind,
  };
}
