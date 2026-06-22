import { Link } from "react-router-dom";
import type { EvidenceLinkRecord } from "../lib/api";
import { formatSourceLabel } from "../lib/format";

const RELATIONSHIP_GROUPS = [
  { key: "SUPPORTS", label: "Supporting Sources" },
  { key: "CONTRADICTS", label: "Contradicting Sources" },
  { key: "QUALIFIES", label: "Qualifying Sources" },
  { key: "MENTIONS", label: "Mentioning Sources" },
] as const;

type Props = {
  evidence: EvidenceLinkRecord[];
};

export function EvidenceSummary({ evidence }: Props) {
  const grouped = RELATIONSHIP_GROUPS.map((group) => ({
    ...group,
    items: evidence.filter((link) => link.relationship === group.key),
  }));

  return (
    <section className="mb-8 max-w-3xl">
      <h3 className="mb-4 text-lg font-semibold text-stone-900">Evidence Summary</h3>
      <div className="space-y-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        {grouped.map((group) => (
          <div key={group.key}>
            <h4 className="text-sm font-medium text-stone-800">
              {group.label} ({group.items.length})
            </h4>
            {group.items.length === 0 ? (
              <p className="mt-1 text-sm text-stone-500">None</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {group.items.map((link) => (
                  <li key={link.evidenceId} className="text-sm">
                    <Link
                      to={`/sources/${encodeURIComponent(link.sourceId)}`}
                      className="font-mono text-xs text-stone-800 hover:underline"
                    >
                      {link.sourceId}
                    </Link>
                    {link.source && (
                      <span className="ml-2 text-stone-600">
                        — {formatSourceLabel(link.source).replace(`${link.sourceId} — `, "")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
