import type { SourceDocumentRecord } from "./api";

export type PasteTextSourceInput = {
  sourceId: string;
  title: string;
  text: string;
  category?: string;
  importance?: string;
  sourceNotes?: string;
};

export type PasteTextSourceResult = {
  sourceId: string;
  sourceCreated: boolean;
  document: SourceDocumentRecord;
};

export function textDocumentFileName(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "notes.txt";
  const lower = trimmed.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md")) return trimmed;
  return `${trimmed}.txt`;
}
