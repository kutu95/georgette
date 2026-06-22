import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      text: `Likely match: ${result.recommended.sourceLabel}. Review below and confirm, or choose a different source.`,
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

function resetFileInput(input: HTMLInputElement | null) {
  if (input) input.value = "";
}

export function SmartDocumentUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<DocumentMatchResult | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedSourceLabel, setSelectedSourceLabel] = useState<string | null>(null);
  const [overwriteFileId, setOverwriteFileId] = useState<string | null>(null);
  const [duplicateResolved, setDuplicateResolved] = useState(false);
  const [documentKind, setDocumentKind] = useState("ORIGINAL");
  const [pageNumber, setPageNumber] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<SourceDocumentRecord | null>(null);

  const hasDuplicates = (analysis?.existingDocuments.length ?? 0) > 0;
  const canProceed = Boolean(analysis && (!hasDuplicates || duplicateResolved));
  const isOverwrite = Boolean(overwriteFileId);

  const applyRecommendation = useCallback((result: DocumentMatchResult) => {
    const recommended = result.recommended;
    if (recommended) {
      setSelectedSourceId(recommended.sourceId);
      setSelectedSourceLabel(recommended.sourceLabel);
      if (recommended.documentKind) {
        setDocumentKind(recommended.documentKind);
      } else if (result.inferredKind !== "OTHER") {
        setDocumentKind(result.inferredKind);
      }
      if (recommended.pageNumber != null) {
        setPageNumber(String(recommended.pageNumber));
      } else if (result.inferredPageNumber != null) {
        setPageNumber(String(result.inferredPageNumber));
      }
    } else {
      setSelectedSourceId(null);
      setSelectedSourceLabel(null);
      if (result.inferredKind !== "OTHER") {
        setDocumentKind(result.inferredKind);
      }
      if (result.inferredPageNumber != null) {
        setPageNumber(String(result.inferredPageNumber));
      }
    }
  }, []);

  function applyExistingDocument(existing: ExistingDocumentMatch) {
    setOverwriteFileId(existing.fileId);
    setSelectedSourceId(existing.sourceId);
    setSelectedSourceLabel(existing.sourceLabel);
    if (existing.documentKind) setDocumentKind(existing.documentKind);
    if (existing.pageNumber != null) setPageNumber(String(existing.pageNumber));
  }

  function clearUploadState() {
    setFile(null);
    setAnalysis(null);
    setSelectedSourceId(null);
    setSelectedSourceLabel(null);
    setOverwriteFileId(null);
    setDuplicateResolved(false);
    setPageNumber("");
    setGroupLabel("");
    setNotes("");
    setUploaded(null);
    setError(null);
    resetFileInput(fileInputRef.current);
  }

  async function handleFileSelect(selected: File | null) {
    clearUploadState();
    setFile(selected);

    if (!selected) return;

    setAnalyzing(true);
    try {
      const result = await api.analyzeSmartDocumentUpload(selected);
      setAnalysis(result);
      setDocumentKind(result.inferredKind !== "OTHER" ? result.inferredKind : "ORIGINAL");
      if (result.inferredPageNumber != null) {
        setPageNumber(String(result.inferredPageNumber));
      }

      if (result.existingDocuments.length === 0) {
        setDuplicateResolved(true);
        applyRecommendation(result);
      } else {
        applyExistingDocument(result.existingDocuments[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleOverwrite() {
    if (!analysis?.existingDocuments.length) return;
    const target =
      analysis.existingDocuments.find((doc) => doc.fileId === overwriteFileId) ??
      analysis.existingDocuments[0];
    applyExistingDocument(target);
    setDuplicateResolved(true);
    setError(null);
  }

  function handleCancelDuplicate() {
    clearUploadState();
  }

  function selectCandidate(candidate: DocumentMatchCandidate) {
    if (isOverwrite) return;
    setSelectedSourceId(candidate.sourceId);
    setSelectedSourceLabel(candidate.sourceLabel);
    if (candidate.documentKind) setDocumentKind(candidate.documentKind);
    if (candidate.pageNumber != null) setPageNumber(String(candidate.pageNumber));
  }

  useEffect(() => {
    if (!analysis || !duplicateResolved || hasDuplicates) return;
    applyRecommendation(analysis);
  }, [analysis, duplicateResolved, hasDuplicates, applyRecommendation]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedSourceId || !canProceed) return;

    setUploading(true);
    setError(null);
    try {
      const created = await api.confirmSmartDocumentUpload(file, {
        sourceId: selectedSourceId,
        documentKind,
        pageNumber: pageNumber ? Number(pageNumber) : undefined,
        groupLabel: groupLabel.trim() || undefined,
        notes: notes.trim() || undefined,
        overwriteFileId: overwriteFileId ?? undefined,
      });
      setUploaded(created);
    } catch (err) {
      if (err instanceof SmartDocumentUploadError) {
        setError(err.message);
        if (err.existingDocuments.length === 1) {
          applyExistingDocument(err.existingDocuments[0]);
        }
        setDuplicateResolved(false);
        setAnalysis((current) =>
          current
            ? { ...current, existingDocuments: err.existingDocuments }
            : current,
        );
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  }

  const status = analysis && canProceed ? statusMessage(analysis) : null;

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-semibold text-stone-900">Smart Document Upload</h2>
      <p className="mt-1 text-sm text-stone-600">
        Upload a document and Georgette will check whether it already exists, then try to match it
        to a source by filename and content. If anything is uncertain, you choose the source
        manually before saving.
      </p>

      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="font-medium text-stone-800">1. Choose file</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => void handleFileSelect(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : file ? "Choose another file" : "Select document"}
            </button>
            {file && (
              <span className="text-sm text-stone-600">
                {file.name} ({Math.round(file.size / 1024)} KB)
              </span>
            )}
          </div>
        </section>

        {analysis && hasDuplicates && !duplicateResolved && (
          <section
            className="rounded-lg border border-red-300 bg-red-50 p-6 shadow-sm"
            role="alertdialog"
            aria-labelledby="duplicate-title"
          >
            <h3 id="duplicate-title" className="font-medium text-red-950">
              Document already exists
            </h3>
            <p className="mt-1 text-sm text-red-900">
              This file matches one or more documents already stored in Georgette. Overwrite the
              existing copy or cancel the upload.
            </p>

            <ul className="mt-4 space-y-2">
              {analysis.existingDocuments.map((existing) => (
                <li key={existing.fileId}>
                  <label
                    className={[
                      "flex cursor-pointer gap-3 rounded-md border px-4 py-3 text-sm",
                      overwriteFileId === existing.fileId
                        ? "border-red-700 bg-white"
                        : "border-red-200 bg-red-50/50",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="overwriteTarget"
                      checked={overwriteFileId === existing.fileId}
                      onChange={() => setOverwriteFileId(existing.fileId)}
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
                onClick={handleOverwrite}
                disabled={!overwriteFileId}
                className="rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Overwrite existing document
              </button>
              <button
                type="button"
                onClick={handleCancelDuplicate}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
              >
                Cancel upload
              </button>
            </div>
          </section>
        )}

        {analysis && canProceed && (
          <>
            {isOverwrite && (
              <section className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">Overwrite confirmed</p>
                <p className="mt-1">
                  Uploading will replace the existing document on{" "}
                  <strong>{selectedSourceLabel ?? selectedSourceId}</strong>.
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
                {analysis.status === "confident"
                  ? "Probable match found"
                  : analysis.status === "ambiguous"
                    ? "Multiple possible matches"
                    : "Manual connection required"}
              </p>
              <p className="mt-1">{status?.text}</p>
              {!analysis.contentMatchingAvailable && (
                <p className="mt-2 text-xs opacity-80">
                  Content matching was skipped because this file does not contain enough readable text
                  (e.g. unscanned PDF or image). Filename matching was used instead.
                </p>
              )}
            </section>

            {!isOverwrite && analysis.candidates.length > 0 && (
              <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <h3 className="font-medium text-stone-800">Suggested matches</h3>
                <ul className="mt-3 space-y-2">
                  {analysis.candidates.map((candidate) => {
                    const selected = selectedSourceId === candidate.sourceId;
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
                          {candidate.fileName && (
                            <p className="mt-1 text-xs text-stone-500">
                              Related document: {candidate.fileName}
                              {candidate.documentKind
                                ? ` (${formatDocumentKind(candidate.documentKind)})`
                                : ""}
                              {candidate.pageNumber != null ? ` · page ${candidate.pageNumber}` : ""}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <form onSubmit={(e) => void handleUpload(e)} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="font-medium text-stone-800">
                {isOverwrite ? "2. Confirm overwrite" : "2. Confirm source and upload"}
              </h3>

              <div className="mt-4 space-y-4">
                <SearchableSelect
                  label="Source"
                  required
                  value={selectedSourceId}
                  displayLabel={selectedSourceLabel}
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
                    setSelectedSourceId(id);
                    setSelectedSourceLabel(option?.label ?? null);
                  }}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-stone-700">Document type</span>
                    <select
                      value={documentKind}
                      onChange={(e) => setDocumentKind(e.target.value)}
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
                      value={pageNumber}
                      onChange={(e) => setPageNumber(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-md border border-stone-300 px-3 py-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-stone-700">Group label</span>
                    <input
                      type="text"
                      value={groupLabel}
                      onChange={(e) => setGroupLabel(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-md border border-stone-300 px-3 py-2"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-stone-700">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-stone-300 px-3 py-2"
                    placeholder="Optional upload notes"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!file || !selectedSourceId || uploading}
                  className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                >
                  {uploading
                    ? isOverwrite
                      ? "Overwriting…"
                      : "Uploading…"
                    : isOverwrite
                      ? "Overwrite document"
                      : "Upload to source"}
                </button>
                {selectedSourceId && (
                  <Link
                    to={`/sources/${encodeURIComponent(selectedSourceId)}`}
                    className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    View source
                  </Link>
                )}
              </div>
            </form>
          </>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {uploaded && uploaded.sourceId && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <p className="font-medium">
              {isOverwrite ? "Document overwritten successfully." : "Document uploaded successfully."}
            </p>
            <p className="mt-1">
              Saved as {uploaded.fileName} on source{" "}
              <Link
                to={`/sources/${encodeURIComponent(uploaded.sourceId)}`}
                className="font-medium underline"
              >
                {uploaded.sourceId}
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={() => navigate(`/sources/${encodeURIComponent(uploaded.sourceId!)}`)}
              className="mt-3 rounded-md bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              Open source documents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
