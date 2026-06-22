import { createHash } from "node:crypto";
import path from "node:path";
import type { DocumentKind } from "@prisma/client";
import { prisma } from "./db.js";
import { inferDocumentKind, readFileText } from "./documentUtils.js";
import { readDocumentFile } from "./storage.js";

export type MatchMethod = "filename" | "content" | "source_id";

export type ExistingDocumentMatchType = "filename" | "content" | "both";

export type ExistingDocumentMatch = {
  fileId: string;
  sourceId: string;
  sourceLabel: string;
  fileName: string | null;
  documentKind: string;
  pageNumber: number | null;
  matchType: ExistingDocumentMatchType;
  reason: string;
};

export type MatchCandidate = {
  sourceId: string;
  sourceLabel: string;
  fileId?: string;
  fileName?: string;
  documentKind?: string;
  pageNumber?: number | null;
  score: number;
  method: MatchMethod;
  reason: string;
};

export type DocumentMatchStatus = "confident" | "ambiguous" | "unmatched";

export type DocumentMatchResult = {
  fileName: string;
  mimeType: string;
  inferredKind: DocumentKind;
  inferredPageNumber: number | null;
  existingDocuments: ExistingDocumentMatch[];
  status: DocumentMatchStatus;
  candidates: MatchCandidate[];
  recommended: MatchCandidate | null;
  contentMatchingAvailable: boolean;
  contentPreview: string | null;
};

const TEXT_KINDS = new Set<DocumentKind>(["TEXT", "OCR", "SUMMARY", "COMBINED_OCR"]);
const CONFIDENT_SCORE = 90;
const MIN_CANDIDATE_SCORE = 35;
const SCORE_GAP_FOR_CONFIDENCE = 20;

function normalizeFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  return base
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFullFileName(name: string): string {
  return name
    .replace(/^.*[/\\]/, "")
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 3),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isMostlyText(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 4000);
  let printable = 0;
  for (const char of sample) {
    const code = char.charCodeAt(0);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)) {
      printable++;
    }
  }
  return printable / sample.length >= 0.85;
}

export function extractUploadText(buffer: Buffer, mimeType: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  const textLike =
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".ocr");

  if (textLike) {
    return buffer.toString("utf-8").slice(0, 100_000).trim();
  }

  const asUtf8 = buffer.toString("utf-8");
  if (isMostlyText(asUtf8)) {
    return asUtf8.slice(0, 100_000).trim();
  }
  return "";
}

export function inferPageFromFileName(fileName: string): number | null {
  const base = fileName.replace(/^.*[/\\]/, "");
  const patterns = [
    /(?:page|p|pg)[-_ ]?(\d{1,4})/i,
    /[-_ ](\d{1,4})(?:\.[^.]+)?$/,
    /^(\d{1,4})(?:\.[^.]+)?$/,
  ];
  for (const pattern of patterns) {
    const match = base.match(pattern);
    if (match) {
      const page = Number.parseInt(match[1], 10);
      if (Number.isFinite(page) && page >= 1) return page;
    }
  }
  return null;
}

function filenameScore(uploadNorm: string, uploadFull: string, candidate: string): number {
  const candidateNorm = normalizeFileName(candidate);
  const candidateFull = normalizeFullFileName(candidate);
  if (!candidateNorm && !candidateFull) return 0;

  if (uploadFull && candidateFull && uploadFull === candidateFull) return 100;
  if (uploadNorm && candidateNorm && uploadNorm === candidateNorm) return 98;

  const shorter =
    uploadNorm.length <= candidateNorm.length ? uploadNorm : candidateNorm;
  const longer =
    uploadNorm.length <= candidateNorm.length ? candidateNorm : uploadNorm;
  if (shorter.length >= 4 && longer.includes(shorter)) {
    return 70 + Math.round((shorter.length / longer.length) * 20);
  }

  const uploadTokens = tokenize(uploadNorm);
  const candidateTokens = tokenize(candidateNorm);
  const overlap = jaccardSimilarity(uploadTokens, candidateTokens);
  return Math.round(overlap * 85);
}

function sourceLabel(source: {
  sourceId: string;
  currentFileName: string | null;
  suggestedStandardFileName: string | null;
}): string {
  const name = source.suggestedStandardFileName || source.currentFileName || "Untitled";
  return `${source.sourceId} — ${name}`;
}

function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function normalizeTextContent(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function findExistingDocuments(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<ExistingDocumentMatch[]> {
  const uploadFull = normalizeFullFileName(fileName);
  const uploadHash = hashBuffer(buffer);
  const uploadText = normalizeTextContent(extractUploadText(buffer, mimeType, fileName));
  const map = new Map<string, ExistingDocumentMatch>();

  const files = await prisma.file.findMany({
    where: {
      documentKind: { not: "COMBINED_OCR" },
      filePath: { not: null },
      sourceId: { not: null },
    },
    select: {
      fileId: true,
      fileName: true,
      sourceId: true,
      documentKind: true,
      pageNumber: true,
      filePath: true,
      source: {
        select: {
          sourceId: true,
          currentFileName: true,
          suggestedStandardFileName: true,
        },
      },
    },
  });

  for (const file of files) {
    if (!file.sourceId || !file.source || !file.filePath) continue;

    let matchType: ExistingDocumentMatchType | null = null;
    let reason = "";

    const storedFull = file.fileName ? normalizeFullFileName(file.fileName) : "";
    if (uploadFull && storedFull && uploadFull === storedFull) {
      matchType = "filename";
      reason = `Same filename as existing document "${file.fileName}"`;
    }

    if (uploadText.length >= 40) {
      try {
        const storedText = normalizeTextContent(await readFileText(file));
        if (storedText.length >= 40 && storedText === uploadText) {
          if (matchType === "filename") {
            matchType = "both";
            reason = `Same filename and identical text content as "${file.fileName}"`;
          } else {
            matchType = "content";
            reason = `Identical text content as "${file.fileName ?? "document"}"`;
          }
        }
      } catch {
        /* skip unreadable file */
      }
    }

    if (!matchType) {
      try {
        const storedBytes = await readDocumentFile(file.sourceId, path.basename(file.filePath));
        if (storedBytes.length === buffer.length && hashBuffer(storedBytes) === uploadHash) {
          if (storedFull && uploadFull && storedFull === uploadFull) {
            matchType = "both";
            reason = `Same filename and identical file content as "${file.fileName}"`;
          } else {
            matchType = "content";
            reason = `Identical file content as "${file.fileName ?? "document"}"`;
          }
        }
      } catch {
        /* skip missing file on disk */
      }
    }

    if (!matchType) continue;

    map.set(file.fileId, {
      fileId: file.fileId,
      sourceId: file.sourceId,
      sourceLabel: sourceLabel(file.source),
      fileName: file.fileName,
      documentKind: file.documentKind,
      pageNumber: file.pageNumber,
      matchType,
      reason,
    });
  }

  return [...map.values()].sort((a, b) => {
    const rank = (match: ExistingDocumentMatch) =>
      match.matchType === "both" ? 0 : match.matchType === "filename" ? 1 : 2;
    return rank(a) - rank(b);
  });
}

function upsertCandidate(
  map: Map<string, MatchCandidate>,
  candidate: MatchCandidate,
): void {
  const key = candidate.fileId
    ? `file:${candidate.fileId}`
    : `source:${candidate.sourceId}:${candidate.method}`;
  const existing = map.get(key);
  if (!existing || candidate.score > existing.score) {
    map.set(key, candidate);
  }
}

function resolveStatus(candidates: MatchCandidate[]): DocumentMatchStatus {
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  if (!top || top.score < MIN_CANDIDATE_SCORE) return "unmatched";

  const second = ranked[1];
  const gap = second ? top.score - second.score : CONFIDENT_SCORE;

  if (top.score >= CONFIDENT_SCORE && (!second || gap >= SCORE_GAP_FOR_CONFIDENCE)) {
    return "confident";
  }
  return "ambiguous";
}

async function matchByFilename(
  uploadFileName: string,
  uploadNorm: string,
  uploadFull: string,
): Promise<MatchCandidate[]> {
  const map = new Map<string, MatchCandidate>();
  const [sources, files] = await Promise.all([
    prisma.source.findMany({
      select: {
        sourceId: true,
        currentFileName: true,
        suggestedStandardFileName: true,
      },
    }),
    prisma.file.findMany({
      where: { documentKind: { not: "COMBINED_OCR" }, sourceId: { not: null } },
      select: {
        fileId: true,
        fileName: true,
        sourceId: true,
        documentKind: true,
        pageNumber: true,
        source: {
          select: {
            sourceId: true,
            currentFileName: true,
            suggestedStandardFileName: true,
          },
        },
      },
    }),
  ]);

  for (const source of sources) {
    const sourceIdLower = source.sourceId.toLowerCase();
    if (
      uploadNorm.includes(sourceIdLower) ||
      uploadFull.includes(sourceIdLower) ||
      uploadFileName.toLowerCase().includes(sourceIdLower)
    ) {
      upsertCandidate(map, {
        sourceId: source.sourceId,
        sourceLabel: sourceLabel(source),
        score: 96,
        method: "source_id",
        reason: `Filename contains source ID "${source.sourceId}"`,
      });
    }

    for (const field of [source.currentFileName, source.suggestedStandardFileName]) {
      if (!field) continue;
      const score = filenameScore(uploadNorm, uploadFull, field);
      if (score < MIN_CANDIDATE_SCORE) continue;
      upsertCandidate(map, {
        sourceId: source.sourceId,
        sourceLabel: sourceLabel(source),
        score,
        method: "filename",
        reason:
          score >= 98
            ? `Filename matches source catalog name "${field}"`
            : `Filename is similar to source catalog name "${field}"`,
      });
    }
  }

  for (const file of files) {
    if (!file.sourceId || !file.fileName || !file.source) continue;
    const score = filenameScore(uploadNorm, uploadFull, file.fileName);
    if (score < MIN_CANDIDATE_SCORE) continue;
    upsertCandidate(map, {
      sourceId: file.sourceId,
      sourceLabel: sourceLabel(file.source),
      fileId: file.fileId,
      fileName: file.fileName,
      documentKind: file.documentKind,
      pageNumber: file.pageNumber,
      score: Math.min(100, score + 2),
      method: "filename",
      reason:
        score >= 98
          ? `Filename matches existing document "${file.fileName}"`
          : `Filename is similar to existing document "${file.fileName}"`,
    });
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

async function matchByContent(
  uploadText: string,
  filenameCandidates: MatchCandidate[],
): Promise<MatchCandidate[]> {
  const normalizedUpload = uploadText.replace(/\s+/g, " ").trim();
  if (normalizedUpload.length < 40) return [];

  const uploadTokens = tokenize(normalizedUpload);
  const uploadSnippet = normalizedUpload.slice(0, 500);
  const map = new Map<string, MatchCandidate>();

  const prioritizedSourceIds = new Set(
    filenameCandidates.slice(0, 10).map((candidate) => candidate.sourceId),
  );

  const textFiles = await prisma.file.findMany({
    where: {
      sourceId: { not: null },
      documentKind: { in: [...TEXT_KINDS] },
      filePath: { not: null },
    },
    select: {
      fileId: true,
      fileName: true,
      sourceId: true,
      documentKind: true,
      pageNumber: true,
      filePath: true,
      source: {
        select: {
          sourceId: true,
          currentFileName: true,
          suggestedStandardFileName: true,
          notes: true,
        },
      },
    },
    take: 300,
    orderBy: { updatedAt: "desc" },
  });

  for (const file of textFiles) {
    if (!file.sourceId || !file.source) continue;

    let score = 0;
    let reason = "";

    if (file.documentKind === "COMBINED_OCR" && !prioritizedSourceIds.has(file.sourceId)) {
      continue;
    }

    let storedText = "";
    try {
      storedText = (await readFileText(file)).replace(/\s+/g, " ").trim();
    } catch {
      continue;
    }
    if (storedText.length < 40) continue;

    if (storedText === normalizedUpload) {
      score = 100;
      reason = `Exact text match with "${file.fileName ?? "document"}"`;
    } else if (
      normalizedUpload.length >= 120 &&
      (storedText.includes(normalizedUpload) || normalizedUpload.includes(storedText))
    ) {
      const shorter = Math.min(storedText.length, normalizedUpload.length);
      const longer = Math.max(storedText.length, normalizedUpload.length);
      score = 88 + Math.round((shorter / longer) * 10);
      reason = `Text content closely matches "${file.fileName ?? "document"}"`;
    } else {
      const overlap = jaccardSimilarity(uploadTokens, tokenize(storedText));
      score = Math.round(overlap * 100);
      if (score < MIN_CANDIDATE_SCORE) {
        if (storedText.slice(0, 500).includes(uploadSnippet.slice(0, 200))) {
          score = 72;
          reason = `Opening text resembles "${file.fileName ?? "document"}"`;
        } else {
          continue;
        }
      } else {
        reason = `Text content resembles "${file.fileName ?? "document"}"`;
      }
    }

    if (prioritizedSourceIds.has(file.sourceId)) {
      score = Math.min(100, score + 5);
    }

    upsertCandidate(map, {
      sourceId: file.sourceId,
      sourceLabel: sourceLabel(file.source),
      fileId: file.fileId,
      fileName: file.fileName ?? undefined,
      documentKind: file.documentKind,
      pageNumber: file.pageNumber,
      score,
      method: "content",
      reason,
    });
  }

  const sourcesWithNotes = await prisma.source.findMany({
    where: { notes: { not: null } },
    select: {
      sourceId: true,
      currentFileName: true,
      suggestedStandardFileName: true,
      notes: true,
    },
    take: 200,
  });

  for (const source of sourcesWithNotes) {
    const notes = source.notes?.replace(/\s+/g, " ").trim() ?? "";
    if (notes.length < 40) continue;
    const overlap = jaccardSimilarity(uploadTokens, tokenize(notes));
    const score = Math.round(overlap * 75);
    if (score < MIN_CANDIDATE_SCORE) continue;
    upsertCandidate(map, {
      sourceId: source.sourceId,
      sourceLabel: sourceLabel(source),
      score,
      method: "content",
      reason: "Text resembles notes on this source record",
    });
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

function mergeCandidates(
  filenameCandidates: MatchCandidate[],
  contentCandidates: MatchCandidate[],
): MatchCandidate[] {
  const map = new Map<string, MatchCandidate>();

  for (const candidate of filenameCandidates) {
    upsertCandidate(map, candidate);
  }

  for (const candidate of contentCandidates) {
    const key = candidate.fileId
      ? `file:${candidate.fileId}`
      : `source:${candidate.sourceId}:${candidate.method}`;
    const existing = map.get(key);
    if (existing) {
      const combinedScore = Math.min(100, Math.round(existing.score * 0.55 + candidate.score * 0.45 + 5));
      map.set(key, {
        ...existing,
        score: Math.max(existing.score, combinedScore),
        method: existing.method === "filename" ? existing.method : candidate.method,
        reason: `${existing.reason}. ${candidate.reason}`,
        fileId: existing.fileId ?? candidate.fileId,
        fileName: existing.fileName ?? candidate.fileName,
        documentKind: existing.documentKind ?? candidate.documentKind,
        pageNumber: existing.pageNumber ?? candidate.pageNumber,
      });
    } else {
      upsertCandidate(map, candidate);
    }
  }

  return [...map.values()]
    .filter((candidate) => candidate.score >= MIN_CANDIDATE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export async function analyzeDocumentMatch(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<DocumentMatchResult> {
  const uploadNorm = normalizeFileName(fileName);
  const uploadFull = normalizeFullFileName(fileName);
  const inferredKind = inferDocumentKind(mimeType, fileName);
  const inferredPageNumber = inferPageFromFileName(fileName);
  const contentPreview = extractUploadText(buffer, mimeType, fileName);
  const contentMatchingAvailable = contentPreview.length >= 40;

  const existingDocuments = await findExistingDocuments(buffer, fileName, mimeType);

  const filenameCandidates = await matchByFilename(fileName, uploadNorm, uploadFull);

  let contentCandidates: MatchCandidate[] = [];
  const topFilename = filenameCandidates[0];
  const needsContentPass =
    contentMatchingAvailable &&
    (!topFilename || topFilename.score < CONFIDENT_SCORE || filenameCandidates.length > 1);

  if (needsContentPass) {
    contentCandidates = await matchByContent(contentPreview, filenameCandidates);
  }

  const candidates = mergeCandidates(filenameCandidates, contentCandidates);
  const status = resolveStatus(candidates);
  const recommended = candidates[0] ?? null;

  return {
    fileName,
    mimeType,
    inferredKind,
    inferredPageNumber,
    existingDocuments,
    status,
    candidates,
    recommended,
    contentMatchingAvailable,
    contentPreview: contentPreview ? contentPreview.slice(0, 400) : null,
  };
}
