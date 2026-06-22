import { useState } from "react";
import { api, type ObservationRecord, type SourceRecord } from "../lib/api";
import { invalidateStats } from "../lib/statsEvents";
import { SourcePreviewCard } from "./SourcePreviewCard";

const CONFIDENCE_OPTIONS = [
  { value: "CERTAIN", label: "Certain" },
  { value: "LIKELY", label: "Likely" },
  { value: "POSSIBLE", label: "Possible" },
  { value: "UNCERTAIN", label: "Uncertain" },
] as const;

type Props = {
  source: SourceRecord;
  onSaved: (observation: ObservationRecord) => void;
  onCancel: () => void;
};

export function ObservationForm({ source, onSaved, onCancel }: Props) {
  const [observationText, setObservationText] = useState("");
  const [pageOrFolio, setPageOrFolio] = useState("");
  const [quote, setQuote] = useState("");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState("LIKELY");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!observationText.trim()) {
      setError("Observation text is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await api.create<ObservationRecord>("observations", {
        sourceId: source.sourceId,
        observationText: observationText.trim(),
        pageOrFolio: pageOrFolio.trim() || null,
        quote: quote.trim() || null,
        notes: notes.trim() || null,
        confidence,
      });
      invalidateStats();
      onSaved(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h4 className="text-base font-semibold text-stone-900">Add Observation</h4>
        <p className="mt-1 text-sm text-stone-600">
          Record what this source actually says — a factual statement before interpretation.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <SourcePreviewCard source={source} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Observation Text *</span>
        <textarea
          value={observationText}
          onChange={(e) => setObservationText(e.target.value)}
          required
          rows={3}
          placeholder="Factual statement extracted from the source…"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          autoFocus
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Page or Folio</span>
          <input
            type="text"
            value={pageOrFolio}
            onChange={(e) => setPageOrFolio(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Confidence</span>
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {CONFIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Quote</span>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={3}
          placeholder="Exact wording from the source, if applicable…"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Observation"}
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
  );
}
