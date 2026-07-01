import { useEffect, useRef, useState } from "react";
import { DocumentViewModal } from "./DocumentViewModal";
import { FormattedTextContent } from "./FormattedTextContent";
import { api, type CombinedOcrResult, type SourceDocumentRecord } from "../lib/api";
import { groupDocumentsByLabel, UPLOAD_DOCUMENT_KINDS } from "../lib/documentKinds";
import { isPageScanKind, nextPageNumber } from "../lib/documentPages";
import { formatDocumentKind, formatPageLabel } from "../lib/format";

type Props = {
  sourceId: string;
  documents: SourceDocumentRecord[];
  onChange: () => void;
};

const UPLOAD_KINDS = UPLOAD_DOCUMENT_KINDS;

function sortForDisplay(docs: SourceDocumentRecord[]): SourceDocumentRecord[] {
  return [...docs].sort((a, b) => {
    const groupA = a.groupLabel ?? "";
    const groupB = b.groupLabel ?? "";
    if (groupA !== groupB) return groupA.localeCompare(groupB);
    if (a.documentKind !== b.documentKind) return a.documentKind.localeCompare(b.documentKind);
    const pageA = a.pageNumber ?? Number.MAX_SAFE_INTEGER;
    const pageB = b.pageNumber ?? Number.MAX_SAFE_INTEGER;
    if (pageA !== pageB) return pageA - pageB;
    return a.sortOrder - b.sortOrder;
  });
}

export function SourceDocumentsPanel({ sourceId, documents, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePageInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showTextForm, setShowTextForm] = useState(false);
  const [uploadKind, setUploadKind] = useState("IMAGE");
  const [uploadPage, setUploadPage] = useState("");
  const [uploadGroup, setUploadGroup] = useState("");
  const [batchStartPage, setBatchStartPage] = useState("1");
  const [batchKind, setBatchKind] = useState("IMAGE");
  const [batchGroup, setBatchGroup] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textKind, setTextKind] = useState("TEXT");
  const [textPage, setTextPage] = useState("");
  const [textGroup, setTextGroup] = useState("");
  const [textNotes, setTextNotes] = useState("");
  const [combinedOcr, setCombinedOcr] = useState<CombinedOcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<SourceDocumentRecord | null>(null);

  const ocrPageCount = documents.filter((d) => d.documentKind === "OCR").length;
  const combinedDoc = documents.find((d) => d.documentKind === "COMBINED_OCR");
  const displayDocs = sortForDisplay(documents.filter((d) => d.documentKind !== "COMBINED_OCR"));
  const groups = groupDocumentsByLabel(displayDocs);
  const suggestedImagePage = nextPageNumber(documents, {
    kinds: ["IMAGE", "ORIGINAL"],
    groupLabel: uploadGroup,
  });
  const suggestedOcrPage = nextPageNumber(documents, {
    kinds: ["OCR"],
    groupLabel: textGroup,
  });

  useEffect(() => {
    if (ocrPageCount === 0) {
      setCombinedOcr(null);
      return;
    }
    api
      .getSourceCombinedOcr(sourceId)
      .then(setCombinedOcr)
      .catch(() => setCombinedOcr(null));
  }, [sourceId, ocrPageCount, documents]);

  function uploadMeta(kind: string, page: string, group: string) {
    const pageKinds = kind === "OCR" ? ["OCR"] : ["IMAGE", "ORIGINAL"];
    const pageNumber = page
      ? Number(page)
      : isPageScanKind(kind) || kind === "OCR"
        ? nextPageNumber(documents, { kinds: pageKinds, groupLabel: group })
        : undefined;
    return {
      documentKind: kind,
      pageNumber,
      groupLabel: group.trim() || undefined,
    };
  }

  async function handleImagePageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const meta = uploadMeta("IMAGE", uploadPage, uploadGroup);
      await api.uploadSourceDocument(sourceId, file, meta);
      setUploadPage(String((meta.pageNumber ?? suggestedImagePage) + 1));
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (imagePageInputRef.current) imagePageInputRef.current.value = "";
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const meta = uploadMeta(uploadKind, uploadPage, uploadGroup);
      await api.uploadSourceDocument(sourceId, file, meta);
      if (isPageScanKind(uploadKind) && meta.pageNumber != null) {
        setUploadPage(String(meta.pageNumber + 1));
      }
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleBatchUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadSourceDocumentBatch(sourceId, Array.from(files), {
        documentKind: batchKind,
        pageNumber: Number(batchStartPage) || 1,
        groupLabel: batchGroup.trim() || undefined,
      });
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch upload failed");
    } finally {
      setUploading(false);
      if (batchInputRef.current) batchInputRef.current.value = "";
    }
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!textContent.trim()) {
      setError("Enter some text to save.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const pageNumber = textPage ? Number(textPage) : suggestedOcrPage;
      await api.createSourceTextDocument(sourceId, {
        text: textContent.trim(),
        fileName: textTitle.trim() || undefined,
        notes: textNotes.trim() || undefined,
        documentKind: textKind,
        pageNumber: textKind === "OCR" ? pageNumber : textPage ? Number(textPage) : undefined,
        groupLabel: textGroup.trim() || undefined,
      });
      if (textKind === "OCR") {
        setTextPage(String(pageNumber + 1));
      }
      setTextContent("");
      setTextTitle("");
      setTextNotes("");
      setShowTextForm(false);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save text");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(doc: SourceDocumentRecord) {
    if (!confirm(`Remove "${doc.fileName ?? doc.fileId}" from this source?`)) return;
    setRemovingId(doc.fileId);
    setError(null);
    try {
      await api.removeDocument(doc.fileId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove document");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Source Documents</h3>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Add page scans one at a time with Add Image Page, or upload several at once. Match
            OCR and summaries to the same page numbers and group label when they belong to one
            document.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={imagePageInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,image/*"
            className="hidden"
            onChange={handleImagePageUpload}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,image/*,application/pdf,text/plain"
            className="hidden"
            onChange={handleFileUpload}
          />
          <input
            ref={batchInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.webp,.tif,.tiff,.txt,image/*,text/plain"
            className="hidden"
            onChange={handleBatchUpload}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => imagePageInputRef.current?.click()}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            Add Image Page
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Upload File
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => batchInputRef.current?.click()}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Upload Multiple Pages…
          </button>
          <button
            type="button"
            onClick={() => setShowTextForm((v) => !v)}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            {showTextForm ? "Cancel Text" : "Paste Text"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
        <p className="sm:col-span-3 text-xs text-stone-600">
          Page scans and single uploads share these settings. Leave page blank to use the next
          available number
          {uploadKind === "IMAGE" || uploadKind === "ORIGINAL"
            ? ` (${suggestedImagePage} in this group)`
            : ""}
          .
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Single upload type</span>
          <select
            value={uploadKind}
            onChange={(e) => setUploadKind(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          >
            {UPLOAD_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Page # (optional)</span>
          <input
            type="number"
            min={1}
            value={uploadPage}
            onChange={(e) => setUploadPage(e.target.value)}
            placeholder={`Next: ${suggestedImagePage}`}
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Group (optional)</span>
          <input
            type="text"
            value={uploadGroup}
            onChange={(e) => setUploadGroup(e.target.value)}
            placeholder="e.g. Lloyd's survey"
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="mb-4 grid gap-3 rounded-lg border border-dashed border-stone-300 bg-white p-4 sm:grid-cols-4">
        <p className="sm:col-span-4 text-xs font-medium text-stone-600">
          Optional batch upload — select multiple files at once; each becomes the next page number.
        </p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Batch type</span>
          <select
            value={batchKind}
            onChange={(e) => setBatchKind(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          >
            <option value="IMAGE">Image / scan</option>
            <option value="OCR">OCR text</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Starting page #</span>
          <input
            type="number"
            min={1}
            value={batchStartPage}
            onChange={(e) => setBatchStartPage(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-stone-600">Group (optional)</span>
          <input
            type="text"
            value={batchGroup}
            onChange={(e) => setBatchGroup(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showTextForm && (
        <form
          onSubmit={handleTextSubmit}
          className="mb-6 space-y-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Type</span>
              <select
                value={textKind}
                onChange={(e) => setTextKind(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="TEXT">Plain text</option>
                <option value="OCR">OCR text (page)</option>
                <option value="SUMMARY">Summary / context</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Page # (OCR)</span>
              <input
                type="number"
                min={1}
                value={textPage}
                onChange={(e) => setTextPage(e.target.value)}
                placeholder={textKind === "OCR" ? `Next: ${suggestedOcrPage}` : undefined}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Group</span>
              <input
                type="text"
                value={textGroup}
                onChange={(e) => setTextGroup(e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Title (optional)</span>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Text</span>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              required
              rows={6}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Notes (optional)</span>
            <input
              type="text"
              value={textNotes}
              onChange={(e) => setTextNotes(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            Save document
          </button>
        </form>
      )}

      {combinedOcr && combinedOcr.pageCount > 0 && (
        <section className="mb-6 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-medium text-sky-950">
              Combined OCR ({combinedOcr.pageCount} page{combinedOcr.pageCount === 1 ? "" : "s"})
            </h4>
            {combinedDoc && (
              <a
                href={api.documentContentUrl(combinedDoc.fileId, true)}
                className="text-xs text-sky-800 hover:underline"
              >
                Download combined file
              </a>
            )}
          </div>
          <FormattedTextContent content={combinedOcr.text} className="mt-2" />
          <p className="mt-2 text-xs text-sky-800">
            Built automatically from OCR page documents, ordered by page number. Formatted view
            does not change the stored file.
          </p>
        </section>
      )}

      {displayDocs.length === 0 ? (
        <p className="text-sm text-stone-500">No documents stored yet.</p>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([groupKey, groupDocs]) => {
            const groupTitle =
              groupKey.startsWith("_ungrouped_") ? null : groupKey;
            return (
              <div key={groupKey}>
                {groupTitle && (
                  <h4 className="mb-2 text-sm font-semibold text-stone-700">{groupTitle}</h4>
                )}
                <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm">
                  {groupDocs.map((doc) => (
                    <li
                      key={doc.fileId}
                      className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900">{doc.fileName ?? doc.fileId}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {formatDocumentKind(doc.documentKind, doc.mimeType)}
                          {doc.pageNumber != null
                            ? ` · ${formatPageLabel(doc.pageNumber)}`
                            : ""}
                          {doc.notes ? ` · ${doc.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingDocument(doc)}
                          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
                        >
                          View
                        </button>
                        <a
                          href={api.documentContentUrl(doc.fileId, true)}
                          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
                        >
                          Download
                        </a>
                        <button
                          type="button"
                          disabled={removingId === doc.fileId}
                          onClick={() => handleRemove(doc)}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {removingId === doc.fileId ? "…" : "Remove"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {viewingDocument && (
        <DocumentViewModal document={viewingDocument} onClose={() => setViewingDocument(null)} />
      )}
    </section>
  );
}
