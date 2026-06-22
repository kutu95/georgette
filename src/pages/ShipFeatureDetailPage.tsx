import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  api,
  type ObservationShipFeatureLinkRecord,
  type ShipFeatureRecord,
} from "../lib/api";
import {
  SHIP_FEATURE_CATEGORIES,
  SHIP_FEATURE_CONFIDENCES,
  SHIP_FEATURE_STATUSES,
  VISUAL_IMPACTS,
} from "../lib/shipFeatureEvidence";
import {
  formatShipFeatureCategory,
  formatShipFeatureConfidence,
  formatShipFeatureStatus,
  formatVisualImpact,
} from "../lib/format";
import { ShipFeatureObservationsPanel } from "../components/ShipFeatureObservationsPanel";

export function ShipFeatureDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [feature, setFeature] = useState<ShipFeatureRecord | null>(null);
  const [observationLinks, setObservationLinks] = useState<ObservationShipFeatureLinkRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const reloadObservations = useCallback(async () => {
    if (!id) return;
    const obsData = await api.getShipFeatureObservations(id);
    setObservationLinks(obsData);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [featureData, obsData] = await Promise.all([
        api.getShipFeature(id),
        api.getShipFeatureObservations(id),
      ]);
      setFeature(featureData);
      setObservationLinks(obsData);
      setForm({ ...featureData });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ship feature");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.update<ShipFeatureRecord>("ship-features", id, form);
      setFeature(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading ship feature…</p>;

  if (!feature) {
    return (
      <div>
        <p className="text-sm text-red-700">{error ?? "Ship feature not found"}</p>
        <Link to="/ship-features" className="mt-4 inline-block text-sm text-stone-700 hover:underline">
          ← Back to Ship Features
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <Link to="/ship-features" className="text-sm text-stone-600 hover:underline">
          ← Ship Features
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-stone-500">{feature.featureId}</p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-900">{feature.featureName}</h2>
          <p className="mt-2 text-sm text-stone-600">
            {formatShipFeatureCategory(feature.category)} ·{" "}
            {formatShipFeatureStatus(feature.status)} ·{" "}
            {formatShipFeatureConfidence(feature.confidence)} confidence ·{" "}
            {formatVisualImpact(feature.visualImpact)} visual impact
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Edit Feature
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setForm({ ...feature });
            }}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="mb-8 space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Feature name</span>
            <input
              type="text"
              required
              value={(form.featureName as string) ?? ""}
              onChange={(e) => setForm({ ...form, featureName: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Category</span>
            <select
              value={(form.category as string) ?? feature.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {SHIP_FEATURE_CATEGORIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Status</span>
              <select
                value={(form.status as string) ?? feature.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                {SHIP_FEATURE_STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Confidence</span>
              <select
                value={(form.confidence as string) ?? feature.confidence}
                onChange={(e) => setForm({ ...form, confidence: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                {SHIP_FEATURE_CONFIDENCES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Visual Impact</span>
              <select
                value={(form.visualImpact as string) ?? feature.visualImpact}
                onChange={(e) => setForm({ ...form, visualImpact: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                {VISUAL_IMPACTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Description</span>
            <textarea
              value={(form.description as string) ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Notes</span>
            <textarea
              value={(form.notes as string) ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      ) : (
        <section className="mb-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Feature ID
              </dt>
              <dd className="mt-1 font-mono text-sm text-stone-900">{feature.featureId}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Category
              </dt>
              <dd className="mt-1 text-sm text-stone-900">
                {formatShipFeatureCategory(feature.category)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Status</dt>
              <dd className="mt-1 text-sm text-stone-900">
                {formatShipFeatureStatus(feature.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Confidence
              </dt>
              <dd className="mt-1 text-sm text-stone-900">
                {formatShipFeatureConfidence(feature.confidence)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                Visual Impact
              </dt>
              <dd className="mt-1 text-sm text-stone-900">
                {formatVisualImpact(feature.visualImpact)}
              </dd>
            </div>
          </dl>
          {feature.description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-stone-700">Description</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{feature.description}</p>
            </div>
          )}
          {feature.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-stone-700">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{feature.notes}</p>
            </div>
          )}
        </section>
      )}

      <ShipFeatureObservationsPanel
        featureId={feature.featureId}
        links={observationLinks}
        editable={editing}
        onLinksChange={async () => {
          await reloadObservations();
          await load();
        }}
      />
    </div>
  );
}
