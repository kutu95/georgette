import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatSourceLabel } from "../lib/format";
import { SHIP_FEATURE_RELATIONSHIPS } from "../lib/shipFeatureEvidence";
import { invalidateStats } from "../lib/statsEvents";
import { SearchableSelect } from "./SearchableSelect";

type Props = {
  featureId: string;
  excludeObservationIds: string[];
  onLinked: () => void;
  onClose: () => void;
};

export function LinkExistingObservationToFeatureModal({
  featureId,
  excludeObservationIds,
  onLinked,
  onClose,
}: Props) {
  const [observationId, setObservationId] = useState<string | null>(null);
  const [observationLabel, setObservationLabel] = useState<string | null>(null);
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

  const searchObservations = useCallback(
    async (q: string) => {
      const { items } = await api.searchObservations({
        q,
        excludeFeatureId: featureId,
      });
      return items
        .filter((o) => !excludeObservationIds.includes(o.observationId))
        .map((o) => ({
          id: o.observationId,
          label: `${o.observationId} — ${o.observationText.slice(0, 60)}${o.source ? ` (${formatSourceLabel(o.source)})` : ""}`,
        }));
    },
    [featureId, excludeObservationIds],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!observationId) {
      setError("Select an observation.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createShipFeatureObservationLink(featureId, {
        observationId,
        relationshipType,
      });
      invalidateStats();
      onLinked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link observation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-feature-observation-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-stone-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="link-feature-observation-title" className="text-lg font-semibold text-stone-900">
          Link Existing Observation
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          Search by observation text, ID, or source name.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <SearchableSelect
            label="Observation"
            required
            value={observationId}
            displayLabel={observationLabel}
            placeholder="Search observations…"
            onSearch={searchObservations}
            onResolve={async (id) => {
              const obs = await api.getObservation(id);
              return {
                id: obs.observationId,
                label: `${obs.observationId} — ${obs.observationText.slice(0, 60)}`,
              };
            }}
            onChange={(id, option) => {
              setObservationId(id);
              setObservationLabel(option?.label ?? null);
            }}
          />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Relationship to this feature
            </span>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {SHIP_FEATURE_RELATIONSHIPS.map((r) => (
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
              {saving ? "Linking…" : "Link Observation"}
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
