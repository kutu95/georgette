import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type ClaimRecord, type EvidenceLinkRecord, type ObservationClaimLinkRecord } from "../lib/api";
import { formatClaimStatus, formatConfidence, formatSourceLabel, truncateCell } from "../lib/format";
import { claimConfig } from "../lib/entities";
import { ClaimTierBadge } from "../components/ClaimTierBadge";
import { EvidenceLinkForm } from "../components/EvidenceLinkForm";
import { EvidenceSummary } from "../components/EvidenceSummary";
import { ClaimObservationsPanel } from "../components/ClaimObservationsPanel";
import { RelationshipBadge } from "../components/RelationshipBadge";

export function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [evidence, setEvidence] = useState<EvidenceLinkRecord[]>([]);
  const [observationLinks, setObservationLinks] = useState<ObservationClaimLinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [addingEvidence, setAddingEvidence] = useState(
    () => searchParams.get("addEvidence") === "1",
  );
  const [evidenceFormKey, setEvidenceFormKey] = useState(0);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const reloadObservations = useCallback(async () => {
    if (!id) return;
    const obsData = await api.getClaimObservations(id);
    setObservationLinks(obsData);
  }, [id]);

  const reloadEvidence = useCallback(async () => {
    if (!id) return;
    const evidenceData = await api.getClaimEvidence(id);
    setEvidence(evidenceData);
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [claimData, evidenceData, obsData] = await Promise.all([
        api.getClaim(id),
        api.getClaimEvidence(id),
        api.getClaimObservations(id),
      ]);
      setClaim(claimData);
      setEvidence(evidenceData);
      setObservationLinks(obsData);
      setForm({ ...claimData });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claim");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("addEvidence") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("addEvidence");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function handleEvidenceSaved() {
    await reloadEvidence();
    setEvidenceFormKey((k) => k + 1);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.update<ClaimRecord>("claims", id, form);
      setClaim(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading claim…</p>;

  if (!claim) {
    return (
      <div>
        <p className="text-sm text-red-700">{error ?? "Claim not found"}</p>
        <Link to="/claims" className="mt-4 inline-block text-sm text-stone-600 hover:text-stone-900">
          ← Back to claims
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Link to="/claims" className="mb-4 inline-block text-sm text-stone-600 hover:text-stone-900">
        ← Back to claims
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-lg font-semibold text-stone-900">{claim.claimId}</h2>
            <ClaimTierBadge tier={claim.claimTier} />
          </div>
          <p className="mt-2 max-w-3xl text-stone-800">{claim.claimText}</p>
          <p className="mt-2 text-sm text-stone-600">
            {formatClaimStatus(claim.status)} · {formatConfidence(claim.confidence)}
            {claim.topic ? ` · ${claim.topic}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Edit Claim
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="mb-8 max-w-3xl space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
        >
          {claimConfig.fields.map((field) => {
            const value = form[field.key] ?? "";
            const rows =
              field.key === "evidenceRequirements" || field.key === "researchQuestions" ? 8 : 4;
            if (field.type === "textarea") {
              return (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-medium text-stone-700">
                    {field.label}
                  </span>
                  <textarea
                    value={String(value)}
                    onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    rows={rows}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              );
            }
            if (field.type === "select" && field.options) {
              return (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-medium text-stone-700">
                    {field.label}
                  </span>
                  <select
                    value={String(value)}
                    onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  >
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label key={field.key} className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">{field.label}</span>
                <input
                  type="text"
                  value={String(value)}
                  onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            );
          })}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm({ ...claim });
              }}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="mb-8 max-w-3xl divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Claim ID</dt>
            <dd className="font-mono text-sm text-stone-900 sm:col-span-2">{claim.claimId}</dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Claim Text</dt>
            <dd className="whitespace-pre-wrap text-sm text-stone-900 sm:col-span-2">
              {claim.claimText}
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Topic</dt>
            <dd className="text-sm text-stone-900 sm:col-span-2">{claim.topic ?? "—"}</dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Tier</dt>
            <dd className="text-sm sm:col-span-2">
              <ClaimTierBadge tier={claim.claimTier} />
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Status</dt>
            <dd className="text-sm text-stone-900 sm:col-span-2">
              {formatClaimStatus(claim.status)}
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Confidence</dt>
            <dd className="text-sm text-stone-900 sm:col-span-2">
              {formatConfidence(claim.confidence)}
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Notes</dt>
            <dd className="whitespace-pre-wrap text-sm text-stone-900 sm:col-span-2">
              {claim.notes ?? "—"}
            </dd>
          </div>
        </dl>
      )}

      <ClaimObservationsPanel
        claimId={claim.claimId}
        claimText={claim.claimText}
        links={observationLinks}
        editable={editing}
        onLinksChange={reloadObservations}
      />

      {!editing && (
        <div className="mb-8 grid max-w-3xl gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-stone-900">Evidence Requirements</h3>
            <p className="mt-1 text-xs text-stone-500">
              What evidence would support or challenge this claim?
            </p>
            <div className="mt-3 whitespace-pre-wrap text-sm text-stone-800">
              {claim.evidenceRequirements?.trim() ? claim.evidenceRequirements : "—"}
            </div>
          </section>
          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-stone-900">Research Questions</h3>
            <p className="mt-1 text-xs text-stone-500">Unresolved questions attached to this claim.</p>
            <div className="mt-3 whitespace-pre-wrap text-sm text-stone-800">
              {claim.researchQuestions?.trim() ? claim.researchQuestions : "—"}
            </div>
          </section>
        </div>
      )}

      {!editing && <EvidenceSummary evidence={evidence} />}

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-stone-900">Evidence</h3>
          {!addingEvidence && (
            <button
              type="button"
              onClick={() => setAddingEvidence(true)}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Add Evidence
            </button>
          )}
        </div>

        {addingEvidence && (
          <div className="mb-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-base font-medium text-stone-800">Add evidence for this claim</h4>
            <EvidenceLinkForm
              key={evidenceFormKey}
              initialClaimId={claim.claimId}
              multiSource
              excludeSourceIds={evidence.map((e) => e.sourceId)}
              onSaved={handleEvidenceSaved}
              onCancel={() => setAddingEvidence(false)}
              saveButtonLabel="Link Selected & Add More"
              cancelButtonLabel="Done"
            />
          </div>
        )}

        {evidence.length === 0 ? (
          <p className="text-sm text-stone-500">
            No evidence linked yet. Add a source to support or qualify this claim.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
            <table className="min-w-max w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-stone-700">Source ID</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Source Title</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Relationship</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Page/Folio</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Quote</th>
                  <th className="px-4 py-3 font-medium text-stone-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {evidence.map((link) => (
                  <tr key={link.evidenceId}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      <Link
                        to={`/sources/${encodeURIComponent(link.sourceId)}`}
                        className="text-stone-800 hover:underline"
                      >
                        {link.sourceId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {link.source ? (
                        <Link
                          to={`/sources/${encodeURIComponent(link.source.sourceId)}`}
                          className="text-stone-800 hover:underline"
                        >
                          {formatSourceLabel(link.source)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RelationshipBadge relationship={link.relationship} />
                    </td>
                    <td className="px-4 py-3">{link.pageOrFolio ?? "—"}</td>
                    <td className="max-w-xs px-4 py-3">{truncateCell(link.quote)}</td>
                    <td className="max-w-xs px-4 py-3">{truncateCell(link.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
