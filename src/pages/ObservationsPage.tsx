import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type ObservationRecord } from "../lib/api";
import {
  formatObservationConfidence,
  formatSourceLabel,
  truncate,
} from "../lib/format";

export function ObservationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const unlinked = searchParams.get("unlinked") ?? "";

  const [items, setItems] = useState<ObservationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.searchObservations({
        q,
        unlinked: unlinked || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
      setFiltered(result.filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [q, unlinked]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-900">Observations</h2>
        <p className="mt-1 text-sm text-stone-600">
          Factual statements extracted from sources — the bridge between evidence and claims.
        </p>
      </div>

      <div className="mb-6 space-y-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("q", e.target.value);
              else next.delete("q");
              setSearchParams(next, { replace: true });
            }}
            placeholder="Search observation text, quote, or source…"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={unlinked === "1"}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.checked) next.set("unlinked", "1");
              else next.delete("unlinked");
              setSearchParams(next, { replace: true });
            }}
          />
          Show only observations without linked claims
        </label>
      </div>

      <p className="mb-4 text-sm text-stone-600">
        {loading ? (
          "Loading…"
        ) : (
          <>
            Showing <strong>{filtered}</strong> of <strong>{total}</strong> observations
          </>
        )}
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-stone-500">No observations match your filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-max w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                <th className="px-4 py-3 font-medium text-stone-700">ID</th>
                <th className="px-4 py-3 font-medium text-stone-700">Observation</th>
                <th className="px-4 py-3 font-medium text-stone-700">Source</th>
                <th className="px-4 py-3 font-medium text-stone-700">Confidence</th>
                <th className="px-4 py-3 font-medium text-stone-700">Claims</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr
                  key={item.observationId}
                  onClick={() =>
                    navigate(`/observations/${encodeURIComponent(item.observationId)}`)
                  }
                  className="cursor-pointer hover:bg-stone-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {item.observationId}
                  </td>
                  <td className="max-w-md px-4 py-3 text-stone-800">
                    {truncate(item.observationText, 100)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                    {item.source ? formatSourceLabel(item.source) : item.sourceId}
                  </td>
                  <td className="px-4 py-3">
                    {formatObservationConfidence(item.confidence)}
                  </td>
                  <td className="px-4 py-3">{item.claimLinks?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
