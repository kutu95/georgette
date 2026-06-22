import type { DocumentKind, File } from "@prisma/client";
import path from "node:path";
import { readDocumentFile } from "./storage.js";

export const DOCUMENT_KINDS = [
  { value: "PDF", label: "PDF" },
  { value: "IMAGE", label: "Image / scan" },
  { value: "DOCX", label: "Word document" },
  { value: "TEXT", label: "Plain text" },
  { value: "OCR", label: "OCR text (page)" },
  { value: "SUMMARY", label: "Summary / context" },
  { value: "ORIGINAL", label: "Original document" },
  { value: "OTHER", label: "Other" },
] as const;

export function inferDocumentKind(mimeType: string, fileName: string): DocumentKind {
  const lower = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "PDF";
  if (
    mimeType.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff"].some((ext) =>
      lower.endsWith(ext),
    )
  ) {
    return "IMAGE";
  }
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/msword" ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  ) {
    return "DOCX";
  }
  if (mimeType.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return "TEXT";
  }
  return "OTHER";
}

export function parseDocumentKind(value: unknown): DocumentKind | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const upper = value.trim().toUpperCase();
  const allowed = new Set(DOCUMENT_KINDS.map((k) => k.value));
  return allowed.has(upper as (typeof DOCUMENT_KINDS)[number]["value"])
    ? (upper as DocumentKind)
    : undefined;
}

export function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export type DocumentMetadataInput = {
  documentKind?: DocumentKind;
  pageNumber?: number | null;
  sortOrder?: number;
  groupLabel?: string | null;
  parentFileId?: string | null;
  notes?: string | null;
};

export function parseDocumentMetadata(body: Record<string, unknown>): DocumentMetadataInput {
  const documentKind = parseDocumentKind(body.documentKind);
  const pageNumber = parseOptionalInt(body.pageNumber);
  const sortOrderRaw = body.sortOrder;
  const sortOrder =
    sortOrderRaw !== undefined && sortOrderRaw !== "" ? Number(sortOrderRaw) || 0 : undefined;
  const groupLabel =
    body.groupLabel !== undefined
      ? typeof body.groupLabel === "string"
        ? body.groupLabel.trim() || null
        : null
      : undefined;
  const parentFileId =
    body.parentFileId !== undefined
      ? typeof body.parentFileId === "string"
        ? body.parentFileId.trim() || null
        : null
      : undefined;
  const notes =
    body.notes !== undefined
      ? typeof body.notes === "string"
        ? body.notes.trim() || null
        : null
      : undefined;

  return { documentKind, pageNumber, sortOrder, groupLabel, parentFileId, notes };
}

export function documentListOrderBy(): Array<
  Record<string, "asc" | "desc">
> {
  return [
    { groupLabel: "asc" },
    { documentKind: "asc" },
    { pageNumber: "asc" },
    { sortOrder: "asc" },
    { createdAt: "asc" },
  ];
}

type FileWithPath = Pick<File, "fileId" | "sourceId" | "filePath" | "fileName" | "pageNumber">;

export async function readFileText(file: FileWithPath): Promise<string> {
  if (!file.sourceId || !file.filePath) return "";
  const storedName = path.basename(file.filePath);
  const data = await readDocumentFile(file.sourceId, storedName);
  return data.toString("utf-8");
}

export function sortOcrPages<T extends Pick<File, "pageNumber" | "sortOrder" | "createdAt">>(
  files: T[],
): T[] {
  return [...files].sort((a, b) => {
    const pageA = a.pageNumber ?? Number.MAX_SAFE_INTEGER;
    const pageB = b.pageNumber ?? Number.MAX_SAFE_INTEGER;
    if (pageA !== pageB) return pageA - pageB;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export async function assembleCombinedOcr(
  ocrPages: Array<
    Pick<File, "fileId" | "sourceId" | "filePath" | "fileName" | "pageNumber" | "sortOrder" | "createdAt">
  >,
): Promise<{ text: string; pageCount: number; pageFileIds: string[] }> {
  const sorted = sortOcrPages(ocrPages);
  const parts: string[] = [];
  const pageFileIds: string[] = [];

  for (const file of sorted) {
    const content = (await readFileText(file)).trim();
    if (!content) continue;
    pageFileIds.push(file.fileId);
    if (file.pageNumber != null) {
      parts.push(`--- Page ${file.pageNumber} ---\n\n${content}`);
    } else {
      parts.push(content);
    }
  }

  return {
    text: parts.join("\n\n"),
    pageCount: pageFileIds.length,
    pageFileIds,
  };
}

export type CombinedOcrResult = {
  text: string;
  pageCount: number;
  pageFileIds: string[];
  sourceId: string;
};
