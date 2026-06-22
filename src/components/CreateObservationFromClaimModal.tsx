import { useEffect, useState } from "react";
import { api, type ObservationRecord } from "../lib/api";
import { formatSourceLabel } from "../lib/format";
import { OBSERVATION_RELATIONSHIPS } from "../lib/observationEvidence";
import { invalidateStats } from "../lib/statsEvents";
import { SearchableSelect } from "./SearchableSelect";

const CONFIDENCE_OPTIONS = [
  { value: "CERTAIN", label: "Certain" },
  { value: "LIKELY", label: "Likely" },
  { value: "POSSIBLE", label: "Possible" },
  { value: "UNCERTAIN", label: "Uncertain" },
] as const;

type Props = {
  claimId: string;
  onCreated: () => void;
  onClose: () => void;
};

export function CreateObservationFromClaimModal({ claimId, onCreated, onClose }: Props) {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [observationText, setObservationText] = useState("");
  const [pageOrFolio, setPageOrFolio] = useState("");
  const [quote, setQuote] = useState("");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState("LIKELY");
  const [relationshipType, setRelationshipType] = useState("SUPPORTS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId) {
      setError("Select a source.");
      return;
    }
    if (!observationText.trim()) {
      setError("Observation text is required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const observation = await api.create<ObservationRecord>("observations", {
        sourceId,
        observationText: observationText.trim(),
        pageOrFolio: pageOrFolio.trim() || null,
        quote: quote.trim() || null,
        notes: notes.trim() || null,
        confidence,
      });

      await api.createObservationClaimLink(observation.observationId, {
        claimId,
        relationshipType,
      });

      invalidateStats();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create observation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-observation-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-stone-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="create-observation-title" className="text-lg font-semibold text-stone-900">
          Create New Observation
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          Record what a source says and link it to this claim in one step.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <SearchableSelect
            label="Source"
            required
            value={sourceId}
            displayLabel={sourceLabel}
            placeholder="Search by ID or filename…"
            onSearch={async (q) => {
              const { items } = await api.searchSourcesAutocomplete(q);
              return items.map((s) => ({
                id: s.sourceId,
                label: formatSourceLabel(s),
              }));
            }}
            onResolve={async (id) => {
              const source = await api.getSource(id);
              return { id: source.sourceId, label: formatSourceLabel(source) };
            }}
            onChange={(id, option) => {
              setSourceId(id);
              setSourceLabel(option?.label ?? null);
            }}
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Observation Text *
            </span>
            <textarea
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              required
              rows={3}
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
              rows={2}
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

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Relationship to this claim
            </span>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {OBSERVATION_RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create & Link Observation"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
