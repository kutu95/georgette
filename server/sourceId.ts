export const SOURCE_ID_PREFIX = "SRC";
export const SOURCE_ID_DIGITS = 4;
export const SOURCE_ID_PATTERN = /^SRC-\d{4}$/i;

export function formatSourceId(sequence: number): string {
  return `${SOURCE_ID_PREFIX}-${String(sequence).padStart(SOURCE_ID_DIGITS, "0")}`;
}

export function parseSourceIdSequence(sourceId: string): number | null {
  const match = sourceId.trim().match(/^SRC-(\d+)$/i);
  if (!match) return null;
  const sequence = Number.parseInt(match[1], 10);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : null;
}

export function nextSourceIdFromExisting(existingIds: string[]): string {
  let max = 0;
  for (const id of existingIds) {
    const sequence = parseSourceIdSequence(id);
    if (sequence != null && sequence > max) max = sequence;
  }
  return formatSourceId(max + 1);
}

export function isStandardSourceId(sourceId: string): boolean {
  return SOURCE_ID_PATTERN.test(sourceId.trim());
}

/** Normalize user input: "42" → SRC-0042, "src-7" → SRC-0007. */
export function normalizeSourceIdInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (/^\d+$/.test(trimmed)) {
    return formatSourceId(Number.parseInt(trimmed, 10));
  }

  const match = trimmed.match(/^SRC-(\d+)$/i);
  if (match) {
    return formatSourceId(Number.parseInt(match[1], 10));
  }

  return trimmed.toUpperCase();
}
