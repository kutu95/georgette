import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type ShipFeatureRecord } from "../lib/api";
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

export function ShipFeaturesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const status = searchParams.get("status") ?? "";
  const confidence = searchParams.get("confidence") ?? "";
  const visualImpact = searchParams.get("visualImpact") ?? "";
  const withoutEvidence = searchParams.get("withoutEvidence") ?? "";

  const [items, setItems] = useState<ShipFeatureRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchShipFeatures({
        q,
        category,
        status,
        confidence,
        visualImpact,
        withoutEvidence: withoutEvidence || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
      setFiltered(result.filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [q, category, status, confidence, visualImpact, withoutEvidence]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm({
      status: "POSSIBLE",
      confidence: "MEDIUM",
      visualImpact: "MINOR",
      category: "OTHER",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.create<ShipFeatureRecord>("ship-features", form);
      setShowForm(false);
      navigate(`/ship-features/${encodeURIComponent(created.featureId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const hasFilters = Boolean(
    q || category || status || confidence || visualImpact || withoutEvidence,
  );

  return (
    <div className="min-w-0">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Ship Features</h2>
          <p className="mt-1 text-sm text-stone-600">
            Technical reconstruction conclusions for drawings, models, and exhibition materials.
            Trace each feature to its supporting observations.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add Feature
        </button>
      </div>

      <div className="mb-6 space-y-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => updateParams({ q: e.target.value })}
            placeholder="Feature name, ID, description, or linked source (e.g. Lloyd's Register)…"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Category</span>
            <select
              value={category}
              onChange={(e) => updateParams({ category: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {SHIP_FEATURE_CATEGORIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Status</span>
            <select
              value={status}
              onChange={(e) => updateParams({ status: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
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
              value={confidence}
              onChange={(e) => updateParams({ confidence: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All confidence levels</option>
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
              value={visualImpact}
              onChange={(e) => updateParams({ visualImpact: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All visual impacts</option>
              {VISUAL_IMPACTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              updateParams({
                q: "",
                category: "",
                status: "",
                confidence: "",
                visualImpact: "",
                withoutEvidence: "",
              })
            }
            className="text-sm text-stone-600 hover:text-stone-900 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-stone-500">Loading ship features…</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-stone-600">
            Showing {filtered} of {total} features
          </p>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
            <table className="min-w-max w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-stone-700">ID</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Feature</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Category</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Status</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Confidence</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Visual Impact</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr key={item.featureId} className="hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      <Link
                        to={`/ship-features/${encodeURIComponent(item.featureId)}`}
                        className="text-stone-800 hover:underline"
                      >
                        {item.featureId}
                      </Link>
                    </td>
                    <td className="max-w-sm px-4 py-3">
                      <Link
                        to={`/ship-features/${encodeURIComponent(item.featureId)}`}
                        className="font-medium text-stone-900 hover:underline"
                      >
                        {item.featureName}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatShipFeatureCategory(item.category)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatShipFeatureStatus(item.status)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatShipFeatureConfidence(item.confidence)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatVisualImpact(item.visualImpact)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                      {item.observationLinks?.length ?? 0}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                      No ship features match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-stone-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-stone-900">New Ship Feature</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">Feature ID</span>
                <input
                  type="text"
                  required
                  value={(form.featureId as string) ?? ""}
                  onChange={(e) => setForm({ ...form, featureId: e.target.value })}
                  placeholder="SF-0011"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-mono"
                />
              </label>
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
                  value={(form.category as string) ?? "OTHER"}
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
                    value={(form.status as string) ?? "POSSIBLE"}
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
                    value={(form.confidence as string) ?? "MEDIUM"}
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
                  <span className="mb-1 block text-sm font-medium text-stone-700">
                    Visual Impact
                  </span>
                  <select
                    value={(form.visualImpact as string) ?? "MINOR"}
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
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Create Feature"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
