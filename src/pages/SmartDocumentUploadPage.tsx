import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SearchableSelect } from "../components/SearchableSelect";
import {
  api,
  SmartDocumentUploadError,
  type DocumentMatchCandidate,
  type DocumentMatchResult,
  type ExistingDocumentMatch,
  type SourceDocumentRecord,
} from "../lib/api";
import { UPLOAD_DOCUMENT_KINDS } from "../lib/documentKinds";
import { formatDocumentKind, formatSourceLabel } from "../lib/format";

type AnalyzeStatus = "pending" | "analyzing" | "done" | "error";
type UploadStatus = "idle" | "uploading" | "uploaded" | "skipped" | "error";

type UploadQueueItem = {
  id: string;
  file: File;
  analysis: DocumentMatchResult | null;
  selectedSourceId: string | null;
  selectedSourceLabel: string | null;
  overwriteFileId: string | null;
  duplicateResolved: boolean;
  documentKind: string;
  pageNumber: string;
  groupLabel: string;
  notes: string;
  analyzeStatus: AnalyzeStatus;
  analyzeError: string | null;
  uploadStatus: UploadStatus;
  uploadError: string | null;
  uploadedRecord: SourceDocumentRecord | null;
};

function queueItemId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function matchMethodLabel(method: DocumentMatchCandidate["method"]): string {
  if (method === "filename") return "Filename";
  if (method === "content") return "Content";
  return "Source ID";
}

function existingMatchLabel(matchType: ExistingDocumentMatch["matchType"]): string {
  if (matchType === "both") return "Filename and content";
  if (matchType === "filename") return "Filename";
  return "Content";
}

function statusMessage(result: DocumentMatchResult): { tone: "ok" | "warn" | "neutral"; text: string } {
  if (result.status === "confident" && result.recommended) {
    return {
      tone: "ok",
      text: `Matched to ${result.recommended.sourceLabel}. Confident matches upload automatically; review only if you want to change the source.`,
    };
  }
  if (result.status === "ambiguous") {
    return {
      tone: "warn",
      text: "Several possible matches were found. Please review the suggestions and select the correct source before uploading.",
    };
  }
  return {
    tone: "warn",
    text: "No confident match was found. Search for and select the source this document belongs to.",
  };
}

function applyRecommendationToItem(
  item: UploadQueueItem,
  result: DocumentMatchResult,
): UploadQueueItem {
  const next = { ...item };
  const recommended = result.recommended;
  if (recommended) {
    next.selectedSourceId = recommended.sourceId;
    next.selectedSourceLabel = recommended.sourceLabel;
    next.documentKind = recommended.documentKind ?? (result.inferredKind !== "OTHER" ? result.inferredKind : next.documentKind);
    next.pageNumber =
      recommended.pageNumber != null
        ? String(recommended.pageNumber)
        : result.inferredPageNumber != null
          ? String(result.inferredPageNumber)
          : next.pageNumber;
  } else {
    next.selectedSourceId = null;
    next.selectedSourceLabel = null;
    if (result.inferredKind !== "OTHER") next.documentKind = result.inferredKind;
    if (result.inferredPageNumber != null) next.pageNumber = String(result.inferredPageNumber);
  }
  return next;
}

function applyExistingToItem(item: UploadQueueItem, existing: ExistingDocumentMatch): UploadQueueItem {
  return {
    ...item,
    overwriteFileId: existing.fileId,
    selectedSourceId: existing.sourceId,
    selectedSourceLabel: existing.sourceLabel,
    documentKind: existing.documentKind ?? item.documentKind,
    pageNumber: existing.pageNumber != null ? String(existing.pageNumber) : item.pageNumber,
  };
}

function itemFromAnalysis(file: File, result: DocumentMatchResult): UploadQueueItem {
  let item: UploadQueueItem = {
    id: queueItemId(file),
    file,
    analysis: result,
    selectedSourceId: null,
    selectedSourceLabel: null,
    overwriteFileId: null,
    duplicateResolved: result.existingDocuments.length === 0,
    documentKind: result.inferredKind !== "OTHER" ? result.inferredKind : "ORIGINAL",
    pageNumber: result.inferredPageNumber != null ? String(result.inferredPageNumber) : "",
    groupLabel: "",
    notes: "",
    analyzeStatus: "done",
    analyzeError: null,
    uploadStatus: "idle",
    uploadError: null,
    uploadedRecord: null,
  };

  if (result.existingDocuments.length > 0) {
    item = applyExistingToItem(item, result.existingDocuments[0]);
  } else {
    item = applyRecommendationToItem(item, result);
  }
  return item;
}

function hasPendingDuplicates(item: UploadQueueItem): boolean {
  return (item.analysis?.existingDocuments.length ?? 0) > 0 && !item.duplicateResolved;
}

function canUploadItem(item: UploadQueueItem): boolean {
  return (
    item.analyzeStatus === "done" &&
    (item.uploadStatus === "idle" || item.uploadStatus === "error") &&
    !hasPendingDuplicates(item) &&
    Boolean(item.selectedSourceId)
  );
}

/** Confident source match, no duplicate — safe to upload without user review. */
function isAutoUploadEligible(item: UploadQueueItem): boolean {
  return (
    item.analyzeStatus === "done" &&
    item.uploadStatus === "idle" &&
    item.analysis?.status === "confident" &&
    item.analysis.existingDocuments.length === 0 &&
    Boolean(item.selectedSourceId) &&
    !item.overwriteFileId
  );
}

function needsManualReview(item: UploadQueueItem): boolean {
  if (item.analyzeStatus === "pending" || item.analyzeStatus === "analyzing") return true;
  if (item.analyzeStatus === "error") return true;
  if (item.uploadStatus === "uploading" || item.uploadStatus === "error") return true;
  if (hasPendingDuplicates(item)) return true;
  if (item.analysis?.status === "confident" && isAutoUploadEligible(item)) return false;
  return true;
}

function queueItemSummary(item: UploadQueueItem): { label: string; tone: string } {
  if (item.analyzeStatus === "pending" || item.analyzeStatus === "analyzing") {
    return { label: item.analyzeStatus === "analyzing" ? "Analyzing…" : "Queued", tone: "text-stone-500" };
  }
  if (item.analyzeStatus === "error") {
    return { label: "Analysis failed", tone: "text-red-700" };
  }
  if (item.uploadStatus === "uploaded") {
    return { label: "Uploaded", tone: "text-green-700" };
  }
  if (item.uploadStatus === "skipped") {
    return { label: "Skipped", tone: "text-stone-500" };
  }
  if (item.uploadStatus === "uploading") {
    return { label: "Uploading…", tone: "text-stone-600" };
  }
  if (item.uploadStatus === "error") {
    return { label: "Upload failed", tone: "text-red-700" };
  }
  if (hasPendingDuplicates(item)) {
    return { label: "Duplicate — action needed", tone: "text-red-700" };
  }
  if (!item.selectedSourceId) {
    return { label: "Select source", tone: "text-amber-700" };
  }
  if (item.overwriteFileId) {
    return { label: "Ready to overwrite", tone: "text-amber-800" };
  }
  return { label: "Ready to upload", tone: "text-green-700" };
}

function resetFileInput(input: HTMLInputElement | null) {
  if (input) input.value = "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SmartDocumentUploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [batchUploading, setBatchUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [autoUploadedCount, setAutoUploadedCount] = useState(0);

  const reviewQueue = queue.filter(needsManualReview);
  const activeItem = reviewQueue.find((item) => item.id === activeId) ?? reviewQueue[0] ?? null;
  const readyCount = reviewQueue.filter(canUploadItem).length;
  const analyzingCount = queue.filter(
    (item) => item.analyzeStatus === "pending" || item.analyzeStatus === "analyzing",
  ).length;

  const updateItem = useCallback((id: string, patch: Partial<UploadQueueItem> | ((item: UploadQueueItem) => UploadQueueItem)) => {
    setQueue((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        return typeof patch === "function" ? patch(item) : { ...item, ...patch };
      }),
    );
  }, []);

  const removeItemById = useCallback((id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
    setActiveId((active) => (active === id ? null : active));
  }, []);

  const performUpload = useCallback(
    async (item: UploadQueueItem, options?: { auto?: boolean }): Promise<boolean> => {
      if (!canUploadItem(item)) return false;

      updateItem(item.id, { uploadStatus: "uploading", uploadError: null });
      try {
        await api.confirmSmartDocumentUpload(item.file, {
          sourceId: item.selectedSourceId!,
          documentKind: item.documentKind,
          pageNumber: item.pageNumber ? Number(item.pageNumber) : undefined,
          groupLabel: item.groupLabel.trim() || undefined,
          notes: item.notes.trim() || undefined,
          overwriteFileId: item.overwriteFileId ?? undefined,
        });
        removeItemById(item.id);
        if (options?.auto) {
          setAutoUploadedCount((count) => count + 1);
        }
        return true;
      } catch (err) {
        if (err instanceof SmartDocumentUploadError) {
          updateItem(item.id, (current) => {
            const next = {
              ...current,
              uploadStatus: "error" as const,
              uploadError: err.message,
              duplicateResolved: false,
            };
            if (err.existingDocuments.length === 1) {
              return applyExistingToItem(
                {
                  ...next,
                  analysis: current.analysis
                    ? { ...current.analysis, existingDocuments: err.existingDocuments }
                    : null,
                },
                err.existingDocuments[0],
              );
            }
            if (current.analysis) {
              return {
                ...next,
                analysis: { ...current.analysis, existingDocuments: err.existingDocuments },
              };
            }
            return next;
          });
        } else {
          updateItem(item.id, {
            uploadStatus: "error",
            uploadError: err instanceof Error ? err.message : "Upload failed",
          });
        }
        return false;
      }
    },
    [updateItem, removeItemById],
  );

  const tryAutoUpload = useCallback(
    async (item: UploadQueueItem) => {
      if (!isAutoUploadEligible(item)) return false;
      return performUpload(item, { auto: true });
    },
    [performUpload],
  );

  const analyzeFile = useCallback(
    async (file: File) => {
      const id = queueItemId(file);
      setQueue((current) => {
        const exists = current.some((item) => item.id === id);
        const pendingItem: UploadQueueItem = {
          id,
          file,
          analysis: null,
          selectedSourceId: null,
          selectedSourceLabel: null,
          overwriteFileId: null,
          duplicateResolved: false,
          documentKind: "ORIGINAL",
          pageNumber: "",
          groupLabel: "",
          notes: "",
          analyzeStatus: "analyzing",
          analyzeError: null,
          uploadStatus: "idle",
          uploadError: null,
          uploadedRecord: null,
        };
        if (exists) {
          return current.map((item) =>
            item.id === id ? { ...pendingItem, uploadStatus: "idle", uploadedRecord: null } : item,
          );
        }
        return [...current, pendingItem];
      });

      try {
        const result = await api.analyzeSmartDocumentUpload(file);
        const item = itemFromAnalysis(file, result);
        setQueue((current) => current.map((i) => (i.id === id ? item : i)));

        if (isAutoUploadEligible(item)) {
          await tryAutoUpload(item);
        } else {
          setActiveId((current) => current ?? id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        setQueue((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, analyzeStatus: "error", analyzeError: message, analysis: null }
              : item,
          ),
        );
        setActiveId((current) => current ?? id);
      }
    },
    [tryAutoUpload],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setGlobalError(null);
      const unique = files.filter(
        (file, index, all) => all.findIndex((f) => queueItemId(f) === queueItemId(file)) === index,
      );
      await Promise.all(unique.map((file) => analyzeFile(file)));
      resetFileInput(fileInputRef.current);
    },
    [analyzeFile],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    void addFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    void addFiles(files);
  }

  function clearQueue() {
    setQueue([]);
    setActiveId(null);
    setGlobalError(null);
    setAutoUploadedCount(0);
    resetFileInput(fileInputRef.current);
  }

  function removeItem(id: string) {
    setQueue((current) => {
      const next = current.filter((item) => item.id !== id);
      setActiveId((active) => (active === id ? next[0]?.id ?? null : active));
      return next;
    });
  }

  function handleOverwriteActive() {
    if (!activeItem?.analysis?.existingDocuments.length) return;
    const target =
      activeItem.analysis.existingDocuments.find((doc) => doc.fileId === activeItem.overwriteFileId) ??
      activeItem.analysis.existingDocuments[0];
    updateItem(activeItem.id, (item) => ({
      ...applyExistingToItem(item, target),
      duplicateResolved: true,
      uploadError: null,
    }));
  }

  function handleSkipDuplicate() {
    if (!activeItem) return;
    removeItem(activeItem.id);
  }

  function selectCandidate(candidate: DocumentMatchCandidate) {
    if (!activeItem || activeItem.overwriteFileId) return;
    updateItem(activeItem.id, {
      selectedSourceId: candidate.sourceId,
      selectedSourceLabel: candidate.sourceLabel,
      documentKind: candidate.documentKind ?? activeItem.documentKind,
      pageNumber: candidate.pageNumber != null ? String(candidate.pageNumber) : activeItem.pageNumber,
    });
  }

  async function uploadItem(item: UploadQueueItem): Promise<boolean> {
    return performUpload(item);
  }

  async function handleUploadActive(e: React.FormEvent) {
    e.preventDefault();
    if (!activeItem) return;
    await uploadItem(activeItem);
  }

  async function handleUploadAllReady() {
    const ready = reviewQueue.filter(canUploadItem);
    if (ready.length === 0) return;
    setBatchUploading(true);
    setGlobalError(null);
    let failures = 0;
    for (const item of ready) {
      const ok = await uploadItem(item);
      if (!ok) failures++;
    }
    if (failures > 0) {
      setGlobalError(`${failures} file${failures === 1 ? "" : "s"} failed to upload. Review errors below.`);
    }
    setBatchUploading(false);
  }

  useEffect(() => {
    setActiveId((current) => {
      if (current && queue.some((item) => item.id === current && needsManualReview(item))) {
        return current;
      }
      return queue.find(needsManualReview)?.id ?? null;
    });
  }, [queue]);

  const analysis = activeItem?.analysis ?? null;
  const hasDuplicates = Boolean(activeItem && hasPendingDuplicates(activeItem));
  const canProceed = Boolean(activeItem && activeItem.analyzeStatus === "done" && !hasDuplicates);
  const isOverwrite = Boolean(activeItem?.overwriteFileId && activeItem.duplicateResolved);
  const status = analysis && canProceed ? statusMessage(analysis) : null;

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold text-stone-900">Smart Document Upload</h2>
      <p className="mt-1 text-sm text-stone-600">
        Drop multiple documents or select several at once. Confident matches upload automatically;
        only uncertain files (duplicates, ambiguous matches, or unknown sources) stay in the queue
        for your review.
      </p>

      {autoUploadedCount > 0 && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p className="font-medium">
            {autoUploadedCount} file{autoUploadedCount === 1 ? "" : "s"} uploaded automatically
          </p>
          <p className="mt-1 text-green-800">
            Confident source matches were saved without manual confirmation.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="font-medium text-stone-800">1. Add files</h3>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              "mt-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragOver
                ? "border-stone-800 bg-stone-100"
                : "border-stone-300 bg-stone-50 hover:border-stone-400",
            ].join(" ")}
          >
            <p className="text-sm font-medium text-stone-800">
              Drag and drop files here
            </p>
            <p className="mt-1 text-sm text-stone-500">or</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleInputChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzingCount > 0 && queue.length === 0}
              className="mt-3 rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              Choose files
            </button>
            <p className="mt-3 text-xs text-stone-500">
              Multiple files supported · up to 100 MB each
            </p>
          </div>

          {reviewQueue.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-stone-600">
                {reviewQueue.length} file{reviewQueue.length === 1 ? "" : "s"} need review
                {analyzingCount > 0 ? ` · ${analyzingCount} analyzing` : ""}
                {readyCount > 0 ? ` · ${readyCount} ready` : ""}
                {autoUploadedCount > 0 ? ` · ${autoUploadedCount} auto-uploaded` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {readyCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleUploadAllReady()}
                    disabled={batchUploading}
                    className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                  >
                    {batchUploading ? "Uploading…" : `Upload all ready (${readyCount})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearQueue}
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
                >
                  Clear queue
                </button>
              </div>
            </div>
          )}
        </section>

        {reviewQueue.length > 0 && (
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <h3 className="px-2 font-medium text-stone-800">Needs review</h3>
            <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
              {reviewQueue.map((item) => {
                const summary = queueItemSummary(item);
                const isActive = item.id === activeId;
                return (
                  <li key={item.id}>
                    <div
                      className={[
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                        isActive ? "bg-stone-100" : "hover:bg-stone-50",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveId(item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate font-medium text-stone-900">{item.file.name}</span>
                        <span className={`block text-xs ${summary.tone}`}>{summary.label}</span>
                      </button>
                      <span className="shrink-0 text-xs text-stone-400">{formatFileSize(item.file.size)}</span>
                      {item.uploadStatus !== "uploading" && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="shrink-0 text-xs text-stone-500 hover:text-stone-800"
                          aria-label={`Remove ${item.file.name}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {activeItem?.analyzeStatus === "error" && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Failed to analyze {activeItem.file.name}: {activeItem.analyzeError}
          </div>
        )}

        {activeItem && analysis && hasDuplicates && (
          <section
            className="rounded-lg border border-red-300 bg-red-50 p-6 shadow-sm"
            role="alertdialog"
            aria-labelledby="duplicate-title"
          >
            <h3 id="duplicate-title" className="font-medium text-red-950">
              Document already exists — {activeItem.file.name}
            </h3>
            <p className="mt-1 text-sm text-red-900">
              This file matches one or more documents already stored in Georgette. Overwrite the
              existing copy, skip this file, or remove it from the queue.
            </p>

            <ul className="mt-4 space-y-2">
              {analysis.existingDocuments.map((existing) => (
                <li key={existing.fileId}>
                  <label
                    className={[
                      "flex cursor-pointer gap-3 rounded-md border px-4 py-3 text-sm",
                      activeItem.overwriteFileId === existing.fileId
                        ? "border-red-700 bg-white"
                        : "border-red-200 bg-red-50/50",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name={`overwriteTarget-${activeItem.id}`}
                      checked={activeItem.overwriteFileId === existing.fileId}
                      onChange={() => updateItem(activeItem.id, { overwriteFileId: existing.fileId })}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-stone-900">{existing.sourceLabel}</span>
                      <span className="mt-1 block text-stone-700">
                        {existing.fileName ?? "Untitled document"}
                        {existing.documentKind
                          ? ` (${formatDocumentKind(existing.documentKind)})`
                          : ""}
                        {existing.pageNumber != null ? ` · page ${existing.pageNumber}` : ""}
                      </span>
                      <span className="mt-1 block text-xs text-stone-500">
                        {existingMatchLabel(existing.matchType)} match — {existing.reason}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleOverwriteActive}
                disabled={!activeItem.overwriteFileId}
                className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Overwrite existing document
              </button>
              <button
                type="button"
                onClick={handleSkipDuplicate}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
              >
                Skip this file
              </button>
              <button
                type="button"
                onClick={() => removeItem(activeItem.id)}
                className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Remove from queue
              </button>
            </div>
          </section>
        )}

        {reviewQueue.length === 0 && autoUploadedCount > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <p className="font-medium">All files processed.</p>
            <p className="mt-1">
              {autoUploadedCount} confident match{autoUploadedCount === 1 ? "" : "es"} uploaded
              automatically with no review needed.
            </p>
          </div>
        )}

        {activeItem && canProceed && (activeItem.uploadStatus === "idle" || activeItem.uploadStatus === "error") && (
          <>
            {isOverwrite && (
              <section className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">Overwrite confirmed — {activeItem.file.name}</p>
                <p className="mt-1">
                  Uploading will replace the existing document on{" "}
                  <strong>{activeItem.selectedSourceLabel ?? activeItem.selectedSourceId}</strong>.
                </p>
              </section>
            )}

            <section
              className={[
                "rounded-lg border px-4 py-3 text-sm",
                status?.tone === "ok"
                  ? "border-green-200 bg-green-50 text-green-900"
                  : status?.tone === "warn"
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-stone-200 bg-stone-50 text-stone-800",
              ].join(" ")}
              role="status"
            >
              <p className="font-medium">
                {activeItem.file.name} —{" "}
                {analysis!.status === "confident"
                  ? "probable match found"
                  : analysis!.status === "ambiguous"
                    ? "multiple possible matches"
                    : "manual connection required"}
              </p>
              <p className="mt-1">{status?.text}</p>
              {!analysis!.contentMatchingAvailable && (
                <p className="mt-2 text-xs opacity-80">
                  Content matching was skipped because this file does not contain enough readable text.
                </p>
              )}
            </section>

            {!isOverwrite && analysis!.candidates.length > 0 && (
              <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="font-medium text-stone-800">Suggested matches</h3>
                <ul className="mt-3 space-y-2">
                  {analysis!.candidates.map((candidate) => {
                    const selected = activeItem.selectedSourceId === candidate.sourceId;
                    return (
                      <li key={`${candidate.sourceId}-${candidate.fileId ?? candidate.method}`}>
                        <button
                          type="button"
                          onClick={() => selectCandidate(candidate)}
                          className={[
                            "w-full rounded-md border px-4 py-3 text-left text-sm transition-colors",
                            selected
                              ? "border-stone-800 bg-stone-100"
                              : "border-stone-200 hover:border-stone-400 hover:bg-stone-50",
                          ].join(" ")}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-stone-900">{candidate.sourceLabel}</span>
                            <span className="text-xs text-stone-500">
                              {matchMethodLabel(candidate.method)} · score {candidate.score}
                            </span>
                          </div>
                          <p className="mt-1 text-stone-600">{candidate.reason}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <form onSubmit={(e) => void handleUploadActive(e)} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="font-medium text-stone-800">
                {isOverwrite ? "2. Confirm overwrite" : "2. Confirm source and upload"}
              </h3>

              <div className="mt-4 space-y-4">
                <SearchableSelect
                  label="Source"
                  required
                  value={activeItem.selectedSourceId}
                  displayLabel={activeItem.selectedSourceLabel}
                  placeholder="Search sources by ID or filename…"
                  disabled={isOverwrite}
                  onSearch={async (q) => {
                    const { items } = await api.searchSourcesAutocomplete(q, 25);
                    return items.map((source) => ({
                      id: source.sourceId,
                      label: formatSourceLabel(source),
                    }));
                  }}
                  onResolve={async (id) => {
                    const source = await api.getSource(id);
                    return { id: source.sourceId, label: formatSourceLabel(source) };
                  }}
                  onChange={(id, option) => {
                    if (isOverwrite) return;
                    updateItem(activeItem.id, {
                      selectedSourceId: id,
                      selectedSourceLabel: option?.label ?? null,
                    });
                  }}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-stone-700">Document type</span>
                    <select
                      value={activeItem.documentKind}
                      onChange={(e) => updateItem(activeItem.id, { documentKind: e.target.value })}
                      className="w-full rounded-md border border-stone-300 px-3 py-2"
                    >
                      {UPLOAD_DOCUMENT_KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-stone-700">Page number</span>
                    <input
                      type="number"
                      min={1}
                      value={activeItem.pageNumber}
                      onChange={(e) => updateItem(activeItem.id, { pageNumber: e.target.value })}
                      placeholder="Optional"
                      className="w-full rounded-md border border-stone-300 px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-stone-700">Group label</span>
                    <input
                      type="text"
                      value={activeItem.groupLabel}
                      onChange={(e) => updateItem(activeItem.id, { groupLabel: e.target.value })}
                      placeholder="Optional"
                      className="w-full rounded-md border border-stone-300 px-3 py-2"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-stone-700">Notes</span>
                  <textarea
                    value={activeItem.notes}
                    onChange={(e) => updateItem(activeItem.id, { notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border border-stone-300 px-3 py-2"
                    placeholder="Optional upload notes"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!canUploadItem(activeItem)}
                  className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                >
                  {isOverwrite ? "Overwrite document" : "Upload this file"}
                </button>
                {activeItem.selectedSourceId && (
                  <Link
                    to={`/sources/${encodeURIComponent(activeItem.selectedSourceId)}`}
                    className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    View source
                  </Link>
                )}
              </div>
            </form>
          </>
        )}

        {activeItem?.uploadStatus === "error" && activeItem.uploadError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {activeItem.file.name}: {activeItem.uploadError}
          </div>
        )}

        {globalError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {globalError}
          </div>
        )}
      </div>
    </div>
  );
}
