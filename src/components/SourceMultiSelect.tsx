import { useCallback, useEffect, useState } from "react";
import { api, type SourceRecord } from "../lib/api";
import { formatSourceLabel } from "../lib/format";

type Props = {
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  excludeSourceIds?: string[];
  onPreviewSource?: (source: SourceRecord | null) => void;
};

export function SourceMultiSelect({
  selectedIds,
  onChange,
  excludeSourceIds = [],
  onPreviewSource,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SourceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const excludeKey = excludeSourceIds.join("\0");

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const excluded = new Set(excludeSourceIds);
        const { items } = await api.searchSourcesAutocomplete(q, 50);
        setResults(items.filter((s) => !excluded.has(s.sourceId)));
      } finally {
        setLoading(false);
      }
    },
    [excludeKey, excludeSourceIds],
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  function toggle(id: string, source: SourceRecord) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      onPreviewSource?.(next.size > 0 ? source : null);
    } else {
      next.add(id);
      onPreviewSource?.(source);
    }
    onChange(next);
  }

  function selectAllVisible() {
    const next = new Set(selectedIds);
    for (const s of results) next.add(s.sourceId);
    onChange(next);
  }

  function clearSelection() {
    onChange(new Set());
    onPreviewSource?.(null);
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Sources <span className="text-red-600">*</span>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ID, filename, or notes…"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-stone-500">
          Select one or more sources to link as evidence
        </span>
      </label>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-600">
        <span>
          <strong>{selectedIds.size}</strong> selected
          {loading && " · searching…"}
        </span>
        <span className="flex gap-2">
          {results.length > 0 && (
            <button type="button" onClick={selectAllVisible} className="hover:text-stone-900">
              Select all shown
            </button>
          )}
          {selectedIds.size > 0 && (
            <button type="button" onClick={clearSelection} className="hover:text-stone-900">
              Clear
            </button>
          )}
        </span>
      </div>

      <ul className="mt-2 max-h-64 overflow-auto rounded-md border border-stone-200 bg-white">
        {!loading && results.length === 0 && (
          <li className="px-3 py-4 text-sm text-stone-500">No sources match your search.</li>
        )}
        {results.map((source) => {
          const checked = selectedIds.has(source.sourceId);
          return (
            <li key={source.sourceId}>
              <label
                className={[
                  "flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm hover:bg-stone-50",
                  checked ? "bg-stone-100" : "",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(source.sourceId, source)}
                  className="mt-1 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-mono text-xs text-stone-600">{source.sourceId}</span>
                  <span className="block text-stone-900">{formatSourceLabel(source)}</span>
                  {source.category && (
                    <span className="mt-0.5 block text-xs text-stone-500">{source.category}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {excludeSourceIds.length > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          Sources already linked to this claim are hidden from results.
        </p>
      )}
    </div>
  );
}
