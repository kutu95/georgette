import type { SourceSummary } from "../lib/format";

type Props = {
  source: SourceSummary;
};

export function SourcePreviewCard({ source }: Props) {
  const displayName =
    source.suggestedStandardFileName || source.currentFileName || "Untitled";

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
      <h4 className="mb-3 font-medium text-stone-800">Source preview</h4>
      <dl className="space-y-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Source ID
          </dt>
          <dd className="font-mono text-stone-900">{source.sourceId}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
            Suggested filename
          </dt>
          <dd className="text-stone-900">{displayName}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Category
            </dt>
            <dd className="text-stone-900">{source.category ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Type</dt>
            <dd className="text-stone-900">{source.documentType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Importance
            </dt>
            <dd className="text-stone-900">{source.importance ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Original / Derived
            </dt>
            <dd className="text-stone-900">{source.originalOrDerived ?? "—"}</dd>
          </div>
        </div>
        {source.notes && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Notes</dt>
            <dd className="whitespace-pre-wrap text-stone-900">{source.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
