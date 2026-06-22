import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type ObservationShipFeatureLinkRecord } from "../lib/api";
import {
  assessReconstructionConfidence,
  summarizeShipFeatureLinks,
} from "../lib/shipFeatureEvidence";
import { formatObservationConfidence, formatSourceLabel } from "../lib/format";
import { invalidateStats } from "../lib/statsEvents";
import { CreateObservationFromFeatureModal } from "./CreateObservationFromFeatureModal";
import { LinkExistingObservationToFeatureModal } from "./LinkExistingObservationToFeatureModal";
import { RelationshipBadge } from "./RelationshipBadge";

type Props = {
  featureId: string;
  links: ObservationShipFeatureLinkRecord[];
  editable: boolean;
  onLinksChange: () => void;
};

export function ShipFeatureObservationsPanel({
  featureId,
  links,
  editable,
  onLinksChange,
}: Props) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = summarizeShipFeatureLinks(links);
  const reconstruction = assessReconstructionConfidence(links);
  const linkedObservationIds = links.map((l) => l.observationId);

  async function handleRemoveLink(link: ObservationShipFeatureLinkRecord) {
    if (
      !confirm(
        "Remove this observation link from the ship feature? The observation itself will not be deleted.",
      )
    ) {
      return;
    }
    setRemovingId(link.linkId);
    setError(null);
    try {
      await api.removeShipFeatureObservationLink(featureId, link.linkId);
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
          <h3 className="text-lg font-semibold text-stone-900">Evidence</h3>
          <p className="mt-1 text-sm text-stone-600">
            Observations from sources that support, contradict, or qualify this reconstruction
            feature.
          </p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Add Existing Observation
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
          <p className="font-medium text-stone-900">Evidence Summary</p>
          <p className="mt-2">
            Supporting observations: <strong>{summary.supports}</strong>
          </p>
          <p className="mt-1 text-stone-700">
            Contradicting observations: {summary.contradicts}
          </p>
          <p className="mt-1 text-stone-700">
            Qualifying observations: {summary.qualifies}
          </p>
          <p className="mt-2 text-stone-700">
            Unique sources: <strong>{reconstruction.uniqueSourceCount}</strong>
          </p>
          <p className="mt-1 text-stone-700">
            Primary sources: {reconstruction.primarySourceCount} · Secondary sources:{" "}
            {reconstruction.secondarySourceCount}
          </p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-950">Reconstruction Confidence</p>
          <p className="mt-2 text-emerald-900">
            <strong>{reconstruction.confidenceLabel}</strong>
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-emerald-800">
            <li>Linked observations: {reconstruction.observationCount}</li>
            <li>Unique sources: {reconstruction.uniqueSourceCount}</li>
          </ul>
          <p className="mt-2 text-xs text-emerald-700 italic">This is a guide only.</p>
        </div>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-stone-500">
          No observations linked yet.
          {editable
            ? " Link an existing observation or create a new one from a source."
            : " Edit this feature to add evidence."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-max w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                <th className="px-4 py-3 font-medium text-stone-700">Observation</th>
                <th className="px-4 py-3 font-medium text-stone-700">Source</th>
                <th className="px-4 py-3 font-medium text-stone-700">Relationship</th>
                <th className="px-4 py-3 font-medium text-stone-700">Confidence</th>
                <th className="px-4 py-3 font-medium text-stone-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {links.map((link) => {
                const obs = link.observation;
                if (!obs) return null;
                return (
                  <tr key={link.linkId}>
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
                    <td className="px-4 py-3">
                      <RelationshipBadge relationship={link.relationshipType} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatObservationConfidence(obs.confidence)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/observations/${encodeURIComponent(obs.observationId)}`}
                          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
                        >
                          View
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
        <LinkExistingObservationToFeatureModal
          featureId={featureId}
          excludeObservationIds={linkedObservationIds}
          onLinked={onLinksChange}
          onClose={() => setShowLinkModal(false)}
        />
      )}

      {showCreateModal && (
        <CreateObservationFromFeatureModal
          featureId={featureId}
          onCreated={onLinksChange}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </section>
  );
}
