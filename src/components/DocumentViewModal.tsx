import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { getDocumentViewMode, type ViewableDocument } from "../lib/documentView";
import { isPhotoDocument, photoMetadataFromRecord } from "../lib/photoMetadata";
import { FormattedTextContent } from "./FormattedTextContent";
import { PhotoMetadataSummary } from "./PhotoMetadataSummary";

type Props = {
  document: ViewableDocument;
  onClose: () => void;
};

export function DocumentViewModal({ document, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoDetails, setPhotoDetails] = useState(document);

  const title = photoDetails.fileName ?? photoDetails.fileId;
  const viewMode = getDocumentViewMode(
    photoDetails.mimeType,
    photoDetails.fileName,
    photoDetails.documentKind,
  );
  const contentUrl = api.documentContentUrl(photoDetails.fileId);
  const photoMetadata = photoMetadataFromRecord(photoDetails);
  const showPhotoMetadata = isPhotoDocument(photoDetails.documentKind, photoDetails.mimeType);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setPhotoDetails(document);
    if (!isPhotoDocument(document.documentKind, document.mimeType)) return;

    let cancelled = false;
    api
      .getDocument(document.fileId)
      .then((record) => {
        if (!cancelled) setPhotoDetails(record);
      })
      .catch(() => {
        /* keep props from list */
      });
    return () => {
      cancelled = true;
    };
  }, [document]);

  useEffect(() => {
    if (viewMode !== "text") {
      setLoading(false);
      setContent(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .fetchDocumentContent(photoDetails.fileId)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load document");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [photoDetails.fileId, viewMode]);

  const modalWidth = viewMode === "pdf" || viewMode === "image" ? "max-w-5xl" : "max-w-3xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-view-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] w-full ${modalWidth} flex-col rounded-lg border border-stone-200 bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div className="min-w-0">
            <h3 id="document-view-title" className="truncate font-semibold text-stone-900">
              {title}
            </h3>
            <p className="mt-1 text-xs text-stone-500">Display only — stored file is not changed</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={api.documentContentUrl(photoDetails.fileId, true)}
              className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {showPhotoMetadata && (
            <PhotoMetadataSummary metadata={photoMetadata} className="mb-4" />
          )}

          {viewMode === "pdf" && (
            <iframe
              src={contentUrl}
              title={title}
              className="h-[75vh] w-full rounded-md border border-stone-200 bg-stone-50"
            />
          )}

          {viewMode === "image" && (
            <div className="flex justify-center rounded-md border border-stone-200 bg-stone-50 p-4">
              <img
                src={contentUrl}
                alt={title}
                className="max-h-[75vh] max-w-full object-contain"
              />
            </div>
          )}

          {viewMode === "unsupported" && (
            <div className="space-y-3 text-sm text-stone-600">
              <p>This file type cannot be previewed in the browser.</p>
              <a
                href={contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md border border-stone-300 px-3 py-2 text-stone-700 hover:bg-stone-50"
              >
                Open in new tab
              </a>
            </div>
          )}

          {viewMode === "text" && loading && (
            <p className="text-sm text-stone-500">Loading document…</p>
          )}

          {viewMode === "text" && error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {viewMode === "text" && content != null && !loading && !error && (
            <FormattedTextContent content={content} />
          )}
        </div>
      </div>
    </div>
  );
}
