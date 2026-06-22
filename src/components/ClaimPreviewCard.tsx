import {
  formatClaimStatus,
  formatConfidence,
  type ClaimSummary,
} from "../lib/format";

type Props = {
  claim: ClaimSummary;
};

export function ClaimPreviewCard({ claim }: Props) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
      <h4 className="mb-3 font-medium text-stone-800">Claim preview</h4>
      <dl className="space-y-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Claim ID</dt>
          <dd className="font-mono text-stone-900">{claim.claimId}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Claim</dt>
          <dd className="whitespace-pre-wrap text-stone-900">{claim.claimText}</dd>
        </div>
        {claim.topic && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Topic</dt>
            <dd className="text-stone-900">{claim.topic}</dd>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">Status</dt>
            <dd className="text-stone-900">{formatClaimStatus(claim.status)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Confidence
            </dt>
            <dd className="text-stone-900">{formatConfidence(claim.confidence)}</dd>
          </div>
        </div>
      </dl>
    </div>
  );
}
