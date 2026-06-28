import { useEffect } from "react";
import type { SourceDocumentRecord } from "../lib/api";
import { formatDocumentKind, formatPageLabel } from "../lib/format";

type Props = {
  sourceLabel: string;
  documents: SourceDocumentRecord[];
  onSelect: (document: SourceDocumentRecord) => void;
  onClose: () => void;
};

export function SourceDocumentPickerModal({
  sourceLabel,
  documents,
  onSelect,
  onClose,
}: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-picker-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-stone-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-stone-200 px-5 py-4">
          <h3 id="document-picker-title" className="font-semibold text-stone-900">
            Choose document to view
          </h3>
          <p className="mt-1 text-sm text-stone-600">{sourceLabel}</p>
        </div>
        <ul className="max-h-80 divide-y divide-stone-100 overflow-y-auto">
          {documents.map((doc) => (
            <li key={doc.fileId}>
              <button
                type="button"
                onClick={() => onSelect(doc)}
                className="w-full px-5 py-3 text-left hover:bg-stone-50"
              >
                <p className="font-medium text-stone-900">{doc.fileName ?? doc.fileId}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {formatDocumentKind(doc.documentKind, doc.mimeType)}
                  {doc.pageNumber != null ? ` · ${formatPageLabel(doc.pageNumber)}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-stone-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
