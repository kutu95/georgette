import { useEffect, useState } from "react";
import { api, type SourceDocumentRecord } from "../lib/api";
import { isTextViewableDocument } from "../lib/normalizeDisplayText";
import { FormattedTextContent } from "./FormattedTextContent";

type Props = {
  document: SourceDocumentRecord;
  onClose: () => void;
};

export function DocumentViewModal({ document, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = document.fileName ?? document.fileId;
  const textViewable = isTextViewableDocument(
    document.mimeType,
    document.fileName,
    document.documentKind,
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!textViewable) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .fetchDocumentContent(document.fileId)
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
  }, [document.fileId, textViewable]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-view-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-stone-200 bg-white shadow-xl"
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
              href={api.documentContentUrl(document.fileId, true)}
              className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              Download
            </a>
            {!textViewable && (
              <a
                href={api.documentContentUrl(document.fileId)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
              >
                Open in tab
              </a>
            )}
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
          {!textViewable && (
            <p className="text-sm text-stone-600">
              This file type is best viewed in your browser or downloaded. Use{" "}
              <strong>Open in tab</strong> for PDFs and images.
            </p>
          )}

          {textViewable && loading && (
            <p className="text-sm text-stone-500">Loading document…</p>
          )}

          {textViewable && error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {textViewable && content != null && !loading && !error && (
            <FormattedTextContent content={content} />
          )}
        </div>
      </div>
    </div>
  );
}
