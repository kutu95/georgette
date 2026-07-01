import { SearchableSelect } from "./SearchableSelect";
import { api } from "../lib/api";
import { formatSourceLabel } from "../lib/format";

type Props = {
  value: string | null | undefined;
  onChange: (sourceId: string | null) => void;
  excludeSourceId?: string | null;
  className?: string;
};

export function ParentSourceSelect({
  value,
  onChange,
  excludeSourceId,
  className = "",
}: Props) {
  const selectedId = typeof value === "string" && value.trim() ? value.trim() : null;

  return (
    <div className={className}>
      <SearchableSelect
        label="Parent Source"
        placeholder="None — search by ID or filename…"
        value={selectedId}
        onSearch={async (q) => {
          const { items } = await api.searchSourcesAutocomplete(q, 25);
          return items
            .filter((source) => source.sourceId !== excludeSourceId)
            .map((source) => ({
              id: source.sourceId,
              label: formatSourceLabel(source),
            }));
        }}
        onResolve={async (id) => {
          const source = await api.getSource(id);
          return { id: source.sourceId, label: formatSourceLabel(source) };
        }}
        onChange={(id) => onChange(id)}
      />
      <p className="mt-1 text-xs text-stone-500">
        Optional. Choose an existing source this record is derived from or related to. Leave empty
        for standalone sources and multi-page documents on one source.
      </p>
    </div>
  );
}
