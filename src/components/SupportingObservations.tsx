import { Link } from "react-router-dom";
import type { ObservationClaimLinkRecord } from "../lib/api";
import { formatObservationConfidence, formatSourceLabel } from "../lib/format";
import { RelationshipBadge } from "./RelationshipBadge";

const RELATIONSHIP_GROUPS = [
  { key: "SUPPORTS", label: "Supports" },
  { key: "CONTRADICTS", label: "Contradicts" },
  { key: "QUALIFIES", label: "Qualifies" },
  { key: "MENTIONS", label: "Mentions" },
] as const;

type Props = {
  links: ObservationClaimLinkRecord[];
};

export function SupportingObservations({ links }: Props) {
  const grouped = RELATIONSHIP_GROUPS.map((group) => ({
    ...group,
    items: links.filter((link) => link.relationshipType === group.key),
  }));

  return (
    <section className="mb-8">
      <h3 className="mb-1 text-lg font-semibold text-stone-900">Supporting Observations</h3>
      <p className="mb-4 text-sm text-stone-600">
        Factual statements from sources that support, qualify, or challenge this claim.
      </p>
      {links.length === 0 ? (
        <p className="text-sm text-stone-500">
          No observations linked yet. Extract observations from sources, then link them here.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div
              key={group.key}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
            >
              <h4 className="text-sm font-medium text-stone-800">
                {group.label} ({group.items.length})
              </h4>
              {group.items.length === 0 ? (
                <p className="mt-1 text-sm text-stone-500">None</p>
              ) : (
                <ul className="mt-3 divide-y divide-stone-100">
                  {group.items.map((link) => {
                    const obs = link.observation;
                    if (!obs) return null;
                    return (
                      <li key={link.linkId} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          to={`/observations/${encodeURIComponent(obs.observationId)}`}
                          className="text-sm text-stone-900 hover:underline"
                        >
                          {obs.observationText}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                          {obs.source && (
                            <Link
                              to={`/sources/${encodeURIComponent(obs.source.sourceId)}`}
                              className="font-mono hover:underline"
                            >
                              {formatSourceLabel(obs.source)}
                            </Link>
                          )}
                          <span>·</span>
                          <span>{formatObservationConfidence(obs.confidence)}</span>
                          <RelationshipBadge relationship={link.relationshipType} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
