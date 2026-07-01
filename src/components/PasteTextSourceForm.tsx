import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SourceIdField } from "./SourceIdField";
import { api } from "../lib/api";
import { textDocumentFileName } from "../lib/pasteTextSource";
import { normalizeSourceIdInput } from "../lib/sourceId";

type Props = {
  onSaved: () => void;
  onCancel: () => void;
};

export function PasteTextSourceForm({ onSaved, onCancel }: Props) {
  const navigate = useNavigate();
  const [sourceId, setSourceId] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [importance, setImportance] = useState("");
  const [sourceNotes, setSourceNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedSourceId, setSavedSourceId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = normalizeSourceIdInput(sourceId);
    const body = text.trim();
    if (!id) {
      setError("Source ID is required.");
      return;
    }
    if (!title.trim()) {
      setError("Document title is required.");
      return;
    }
    if (!body) {
      setError("Paste some text to save.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.createSourceFromPastedText({
        sourceId: id,
        title: title.trim(),
        text: body,
        category: category.trim() || undefined,
        importance: importance.trim() || undefined,
        sourceNotes: sourceNotes.trim() || undefined,
      });
      const fileName = textDocumentFileName(title);
      setSavedSourceId(result.sourceId);
      setSuccess(
        result.sourceCreated
          ? `Created source ${result.sourceId} with plain text document "${fileName}".`
          : `Added plain text document "${fileName}" to existing source ${result.sourceId}.`,
      );
      setSourceId("");
      setTitle("");
      setText("");
      setCategory("");
      setImportance("");
      setSourceNotes("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-medium text-stone-900">Paste text as new source</h3>
      <p className="mt-1 text-sm text-stone-600">
        Create a source record and save pasted content as a plain text document (.txt). If the
        source ID already exists, the text is added as a new document on that source.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p>{success}</p>
          <button
            type="button"
            onClick={() =>
              savedSourceId &&
              navigate(`/sources/${encodeURIComponent(savedSourceId)}`)
            }
            className="mt-2 text-sm font-medium text-green-800 underline hover:text-green-950 disabled:opacity-50"
            disabled={!savedSourceId}
          >
            Open source
          </button>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SourceIdField
            value={sourceId}
            onChange={setSourceId}
            required
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Document title <span className="text-red-600">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Newspaper clipping notes"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-stone-500">
              Saved as {title.trim() ? textDocumentFileName(title) : "title.txt"}
            </span>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Text content <span className="text-red-600">*</span>
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={12}
            placeholder="Paste or type the document text here…"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm leading-relaxed"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Category</span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Importance</span>
            <input
              type="text"
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="mb-1 block text-sm font-medium text-stone-700">Source notes</span>
            <input
              type="text"
              value={sourceNotes}
              onChange={(e) => setSourceNotes(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save source & text document"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
