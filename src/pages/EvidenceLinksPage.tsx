import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type EvidenceFilterOptions, type EvidenceLinkRecord } from "../lib/api";
import { formatSourceLabel, truncateCell } from "../lib/format";
import { EvidenceLinkForm } from "../components/EvidenceLinkForm";
import { RelationshipBadge } from "../components/RelationshipBadge";

const SORT_OPTIONS = [
  { value: "claim", label: "Claim" },
  { value: "source", label: "Source" },
  { value: "relationship", label: "Relationship" },
] as const;

const RELATIONSHIP_FILTERS = [
  { value: "", label: "All" },
  { value: "SUPPORTS", label: "Supports" },
  { value: "CONTRADICTS", label: "Contradicts" },
  { value: "QUALIFIES", label: "Qualifies" },
  { value: "MENTIONS", label: "Mentions" },
] as const;

export function EvidenceLinksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showNew = searchParams.get("new") === "1";
  const editId = searchParams.get("edit");
  const presetClaimId = searchParams.get("claimId");

  useEffect(() => {
    if (showNew && presetClaimId && !editId) {
      navigate(`/claims/${encodeURIComponent(presetClaimId)}?addEvidence=1`, {
        replace: true,
      });
    }
  }, [showNew, presetClaimId, editId, navigate]);

  const relationship = searchParams.get("relationship") ?? "";
  const sourceCategory = searchParams.get("sourceCategory") ?? "";
  const sourceImportance = searchParams.get("sourceImportance") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "claim";
  const sortDir = (searchParams.get("sortDir") ?? "asc") as "asc" | "desc";

  const [items, setItems] = useState<EvidenceLinkRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [filterOptions, setFilterOptions] = useState<EvidenceFilterOptions>({
    relationships: [],
    sourceCategories: [],
    sourceImportances: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [result, options] = await Promise.all([
        api.searchEvidence({ relationship, sourceCategory, sourceImportance, sortBy, sortDir }),
        api.getEvidenceFilterOptions(),
      ]);
      setItems(result.items);
      setTotal(result.total);
      setFiltered(result.filtered);
      setFilterOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [relationship, sourceCategory, sourceImportance, sortBy, sortDir]);

  useEffect(() => {
    if (!showNew && !editId) load();
  }, [load, showNew, editId]);

  function openNew() {
    const next = new URLSearchParams(searchParams);
    next.set("new", "1");
    setSearchParams(next);
  }

  function closeForm() {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("edit");
    next.delete("claimId");
    setSearchParams(next);
    load();
  }

  const showingForm = showNew || Boolean(editId);

  return (
    <div className="min-w-0">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Evidence Explorer</h2>
          <p className="mt-1 text-sm text-stone-600">
            Review all evidence links across the project — supporting, contradictory, and qualifying.
          </p>
        </div>
        {!showingForm && (
          <button
            type="button"
            onClick={openNew}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Add Evidence
          </button>
        )}
      </div>

      {showingForm ? (
        <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium">
            {editId ? "Edit Evidence Link" : "Add Evidence Link"}
          </h3>
          <EvidenceLinkForm
            initialClaimId={presetClaimId}
            evidenceId={editId ?? undefined}
            onSaved={closeForm}
            onCancel={closeForm}
          />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {RELATIONSHIP_FILTERS.map((f) => (
              <button
                key={f.value || "all"}
                type="button"
                onClick={() => updateParams({ relationship: f.value })}
                className={[
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  relationship === f.value
                    ? "bg-stone-800 text-white"
                    : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mb-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Source category</span>
              <select
                value={sourceCategory}
                onChange={(e) => updateParams({ sourceCategory: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {filterOptions.sourceCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Source importance</span>
              <select
                value={sourceImportance}
                onChange={(e) => updateParams({ sourceImportance: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {filterOptions.sourceImportances.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => updateParams({ sortBy: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Direction</span>
              <select
                value={sortDir}
                onChange={(e) => updateParams({ sortDir: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          </div>

          <p className="mb-4 text-sm text-stone-600">
            {loading ? (
              "Loading…"
            ) : (
              <>
                Showing <strong>{filtered}</strong> of <strong>{total}</strong> evidence links
              </>
            )}
          </p>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {!loading && items.length === 0 ? (
            <p className="text-sm text-stone-500">No evidence links match your filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
              <table className="min-w-max w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">Claim</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">Source</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">
                      Relationship
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">
                      Page/Folio
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">Quote</th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium text-stone-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item) => (
                    <tr key={item.evidenceId} className="hover:bg-stone-50">
                      <td className="max-w-xs px-4 py-3 text-stone-800">
                        {item.claim ? (
                          <Link
                            to={`/claims/${encodeURIComponent(item.claim.claimId)}`}
                            className="hover:underline"
                          >
                            {truncateCell(item.claim.claimText, 50)}
                          </Link>
                        ) : (
                          item.claimId
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-stone-800">
                        {item.source ? (
                          <Link
                            to={`/sources/${encodeURIComponent(item.source.sourceId)}`}
                            className="hover:underline"
                          >
                            {formatSourceLabel(item.source)}
                          </Link>
                        ) : (
                          item.sourceId
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <RelationshipBadge relationship={item.relationship} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{item.pageOrFolio ?? "—"}</td>
                      <td className="max-w-xs px-4 py-3">{truncateCell(item.quote)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={() => updateParams({ edit: item.evidenceId })}
                          className="text-stone-600 hover:text-stone-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
