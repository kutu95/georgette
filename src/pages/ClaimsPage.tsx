import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type ClaimRecord } from "../lib/api";
import { formatClaimStatus, formatConfidence, truncate } from "../lib/format";
import { claimConfig } from "../lib/entities";
import { ClaimTierBadge } from "../components/ClaimTierBadge";

const tierField = claimConfig.fields.find((f) => f.key === "claimTier");
const statusField = claimConfig.fields.find((f) => f.key === "status");
const confidenceField = claimConfig.fields.find((f) => f.key === "confidence");

export function ClaimsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const tier = searchParams.get("tier") ?? "";
  const status = searchParams.get("status") ?? "";
  const confidence = searchParams.get("confidence") ?? "";

  const [items, setItems] = useState<ClaimRecord[]>([]);
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
      const result = await api.searchClaimsList({ q, tier, status, confidence });
      setItems(result.items);
      setTotal(result.total);
      setFiltered(result.filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [q, tier, status, confidence]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm({ status: "DRAFT", confidence: "LOW", claimTier: "TIER_2" });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.create<ClaimRecord>("claims", form);
      setShowForm(false);
      navigate(`/claims/${encodeURIComponent(created.claimId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const hasFilters = Boolean(q || tier || status || confidence);

  return (
    <div className="min-w-0">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{claimConfig.title}</h2>
          <p className="mt-1 text-sm text-stone-600">{claimConfig.description}</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add Claim
        </button>
      </div>

      <div className="mb-6 space-y-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Search claims</span>
          <input
            type="search"
            value={q}
            onChange={(e) => updateParams({ q: e.target.value })}
            placeholder="Search by claim ID, text, or topic…"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Tier</span>
            <select
              value={tier}
              onChange={(e) => updateParams({ tier: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All tiers</option>
              {tierField?.options?.map((o) => (
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
              {statusField?.options?.map((o) => (
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
              {confidenceField?.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="mb-4 text-sm text-stone-600">
        {loading ? (
          "Loading…"
        ) : hasFilters ? (
          <>
            Showing <strong>{filtered}</strong> matching claims of <strong>{total}</strong> total
          </>
        ) : (
          <>
            Showing <strong>{filtered}</strong> of <strong>{total}</strong> claims
          </>
        )}
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium">New Claim</h3>
          <form onSubmit={handleSave} className="grid gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Claim Text *</span>
              <textarea
                value={String(form.claimText ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, claimText: e.target.value }))}
                required
                rows={4}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white"
              >
                {saving ? "Saving…" : "Save & Open"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-stone-500">No claims match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-max w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                <th className="px-4 py-3 font-medium text-stone-700">ID</th>
                <th className="px-4 py-3 font-medium text-stone-700">Tier</th>
                <th className="px-4 py-3 font-medium text-stone-700">Claim</th>
                <th className="px-4 py-3 font-medium text-stone-700">Status</th>
                <th className="px-4 py-3 font-medium text-stone-700">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr
                  key={item.claimId}
                  onClick={() => navigate(`/claims/${encodeURIComponent(item.claimId)}`)}
                  className="cursor-pointer hover:bg-stone-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{item.claimId}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ClaimTierBadge tier={item.claimTier} />
                  </td>
                  <td className="px-4 py-3 text-stone-800">{truncate(item.claimText, 100)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatClaimStatus(item.status)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatConfidence(item.confidence)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
