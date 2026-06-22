import fs from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = process.env.STORAGE_PATH ?? path.join(process.cwd(), "storage");
const DOCUMENTS_DIR = path.join(STORAGE_ROOT, "documents");

export function getDocumentsRoot(): string {
  return DOCUMENTS_DIR;
}

export function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureDocumentsDir(sourceId: string): Promise<string> {
  const dir = path.join(DOCUMENTS_DIR, safePathSegment(sourceId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function resolveStoredFilePath(sourceId: string, storedName: string): string {
  const dir = path.join(DOCUMENTS_DIR, safePathSegment(sourceId));
  const resolved = path.resolve(dir, storedName);
  if (!resolved.startsWith(path.resolve(dir) + path.sep) && resolved !== path.resolve(dir)) {
    throw new Error("Invalid file path");
  }
  return resolved;
}

export async function writeDocumentFile(
  sourceId: string,
  storedName: string,
  data: Buffer,
): Promise<string> {
  const dir = await ensureDocumentsDir(sourceId);
  const absolutePath = path.join(dir, storedName);
  await fs.writeFile(absolutePath, data);
  return path.join(safePathSegment(sourceId), storedName);
}

export async function readDocumentFile(sourceId: string, storedName: string): Promise<Buffer> {
  const absolutePath = resolveStoredFilePath(sourceId, storedName);
  return fs.readFile(absolutePath);
}

export async function deleteDocumentFile(sourceId: string, storedName: string): Promise<void> {
  const absolutePath = resolveStoredFilePath(sourceId, storedName);
  await fs.unlink(absolutePath);
}

export function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/tiff": ".tif",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };
  return map[mimeType] ?? "";
}

export function extensionFromFileName(fileName: string): string {
  const ext = path.extname(fileName);
  return ext || "";
}
