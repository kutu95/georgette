import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type ObservationClaimLinkRecord } from "../lib/api";
import {
  assessEvidenceStrength,
  summarizeObservationLinks,
} from "../lib/observationEvidence";
import { formatObservationConfidence, formatSourceLabel } from "../lib/format";
import { invalidateStats } from "../lib/statsEvents";
import { CreateObservationFromClaimModal } from "./CreateObservationFromClaimModal";
import { LinkExistingObservationModal } from "./LinkExistingObservationModal";
import { RelationshipBadge } from "./RelationshipBadge";

type Props = {
  claimId: string;
  claimText?: string;
  links: ObservationClaimLinkRecord[];
  editable: boolean;
  onLinksChange: () => void;
};

export function ClaimObservationsPanel({
  claimId,
  claimText,
  links,
  editable,
  onLinksChange,
}: Props) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = summarizeObservationLinks(links);
  const strength = assessEvidenceStrength(links);
  const linkedObservationIds = links.map((l) => l.observationId);

  async function handleRemoveLink(link: ObservationClaimLinkRecord) {
    if (
      !confirm(
        "Remove this observation link from the claim? The observation itself will not be deleted.",
      )
    ) {
      return;
    }
    setRemovingId(link.linkId);
    setError(null);
    try {
      await api.removeObservationClaimLink(link.observationId, link.linkId);
      invalidateStats();
      onLinksChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove link");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Observations</h3>
          <p className="mt-1 text-sm text-stone-600">
            Primary evidence layer — factual statements from sources linked to this claim.
          </p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Link Existing Observation
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="rounded-md bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Create New Observation
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800">
          <p className="font-medium text-stone-900">Summary</p>
          <p className="mt-2">
            Observations: <strong>{summary.total}</strong>
          </p>
          <p className="mt-1 text-stone-700">
            Supports: {summary.supports} · Contradicts: {summary.contradicts} · Qualifies:{" "}
            {summary.qualifies} · Mentions: {summary.mentions}
          </p>
        </div>

        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
          <p className="font-medium text-sky-950">Preliminary Evidence Assessment</p>
          <p className="mt-2 text-sky-900">
            Evidence Strength: <strong>{strength.strengthLabel}</strong>
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-sky-800">
            <li>Linked observations: {strength.observationCount}</li>
            <li>Unique sources: {strength.uniqueSourceCount}</li>
            <li>Primary sources: {strength.primarySourceCount}</li>
            <li>Secondary sources: {strength.secondarySourceCount}</li>
          </ul>
          <p className="mt-2 text-xs text-sky-700 italic">
            Guide only — not a substitute for historian judgment.
          </p>
        </div>
      </div>

      {editable && claimText && (
        <p className="mb-4 text-xs text-stone-500">
          Future:{" "}
          <span className="italic">Create Observation From Highlighted Claim Text</span> — not yet
          available (
          <code className="rounded bg-stone-100 px-1">observation-from-highlighted-claim-text</code>
          ).
        </p>
      )}

      {links.length === 0 ? (
        <p className="text-sm text-stone-500">
          No observations linked yet.
          {editable
            ? " Link an existing observation or create a new one from a source."
            : " Edit this claim to add observations."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-max w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                <th className="px-4 py-3 font-medium text-stone-700">ID</th>
                <th className="px-4 py-3 font-medium text-stone-700">Observation</th>
                <th className="px-4 py-3 font-medium text-stone-700">Source</th>
                <th className="px-4 py-3 font-medium text-stone-700">Confidence</th>
                <th className="px-4 py-3 font-medium text-stone-700">Relationship</th>
                <th className="px-4 py-3 font-medium text-stone-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {links.map((link) => {
                const obs = link.observation;
                if (!obs) return null;
                return (
                  <tr key={link.linkId}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {obs.observationId}
                    </td>
                    <td className="max-w-sm px-4 py-3 text-stone-800">{obs.observationText}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {obs.source ? (
                        <Link
                          to={`/sources/${encodeURIComponent(obs.source.sourceId)}`}
                          className="text-stone-800 hover:underline"
                        >
                          {formatSourceLabel(obs.source)}
                        </Link>
                      ) : (
                        obs.sourceId
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatObservationConfidence(obs.confidence)}
                    </td>
                    <td className="px-4 py-3">
                      <RelationshipBadge relationship={link.relationshipType} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/observations/${encodeURIComponent(obs.observationId)}`}
                          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
                        >
                          View Observation
                        </Link>
                        {editable && (
                          <button
                            type="button"
                            disabled={removingId === link.linkId}
                            onClick={() => handleRemoveLink(link)}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {removingId === link.linkId ? "…" : "Remove Link"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showLinkModal && (
        <LinkExistingObservationModal
          claimId={claimId}
          excludeObservationIds={linkedObservationIds}
          onLinked={onLinksChange}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {showCreateModal && (
        <CreateObservationFromClaimModal
          claimId={claimId}
          onCreated={onLinksChange}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </section>
  );
}
