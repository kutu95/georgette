import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ObservationRecord } from "../lib/api";
import { formatObservationConfidence, formatSourceLabel } from "../lib/format";
import { CreateClaimFromObservationForm } from "../components/CreateClaimFromObservationForm";
import { RelationshipBadge } from "../components/RelationshipBadge";

export function ObservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [observation, setObservation] = useState<ObservationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creatingClaim, setCreatingClaim] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getObservation(id);
      setObservation(data);
      setForm({
        observationText: data.observationText,
        pageOrFolio: data.pageOrFolio ?? "",
        quote: data.quote ?? "",
        notes: data.notes ?? "",
        confidence: data.confidence,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load observation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.update<ObservationRecord>("observations", id, {
        observationText: form.observationText.trim(),
        pageOrFolio: form.pageOrFolio.trim() || null,
        quote: form.quote.trim() || null,
        notes: form.notes.trim() || null,
        confidence: form.confidence,
      });
      setObservation(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading observation…</p>;

  if (!observation) {
    return (
      <div>
        <p className="text-sm text-red-700">{error ?? "Observation not found"}</p>
        <Link
          to="/observations"
          className="mt-4 inline-block text-sm text-stone-600 hover:text-stone-900"
        >
          ← Back to observations
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <Link
        to="/observations"
        className="mb-4 inline-block text-sm text-stone-600 hover:text-stone-900"
      >
        ← Back to observations
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-lg font-semibold text-stone-900">
            {observation.observationId}
          </h2>
          <p className="mt-2 max-w-3xl text-stone-800">{observation.observationText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing && !creatingClaim && (
            <>
              <button
                type="button"
                onClick={() => setCreatingClaim(true)}
                className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              >
                Create Claim From Observation
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {creatingClaim && !editing && (
        <CreateClaimFromObservationForm
          observation={observation}
          onCancel={() => setCreatingClaim(false)}
        />
      )}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="mb-8 max-w-3xl space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Observation Text *
            </span>
            <textarea
              value={form.observationText}
              onChange={(e) => setForm((p) => ({ ...p, observationText: e.target.value }))}
              required
              rows={4}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Page or Folio</span>
              <input
                type="text"
                value={form.pageOrFolio}
                onChange={(e) => setForm((p) => ({ ...p, pageOrFolio: e.target.value }))}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-700">Confidence</span>
              <select
                value={form.confidence}
                onChange={(e) => setForm((p) => ({ ...p, confidence: e.target.value }))}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="CERTAIN">Certain</option>
                <option value="LIKELY">Likely</option>
                <option value="POSSIBLE">Possible</option>
                <option value="UNCERTAIN">Uncertain</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Quote</span>
            <textarea
              value={form.quote}
              onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
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
              onClick={() => setEditing(false)}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        !creatingClaim && (
          <dl className="mb-8 max-w-3xl divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm">
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Source</dt>
              <dd className="text-sm sm:col-span-2">
                {observation.source ? (
                  <Link
                    to={`/sources/${encodeURIComponent(observation.source.sourceId)}`}
                    className="text-stone-800 hover:underline"
                  >
                    {formatSourceLabel(observation.source)}
                  </Link>
                ) : (
                  observation.sourceId
                )}
              </dd>
            </div>
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Observation Text</dt>
              <dd className="whitespace-pre-wrap text-sm text-stone-900 sm:col-span-2">
                {observation.observationText}
              </dd>
            </div>
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Page/Folio</dt>
              <dd className="text-sm text-stone-900 sm:col-span-2">
                {observation.pageOrFolio ?? "—"}
              </dd>
            </div>
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Quote</dt>
              <dd className="whitespace-pre-wrap text-sm text-stone-900 sm:col-span-2">
                {observation.quote ?? "—"}
              </dd>
            </div>
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Notes</dt>
              <dd className="whitespace-pre-wrap text-sm text-stone-900 sm:col-span-2">
                {observation.notes ?? "—"}
              </dd>
            </div>
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Confidence</dt>
              <dd className="text-sm text-stone-900 sm:col-span-2">
                {formatObservationConfidence(observation.confidence)}
              </dd>
            </div>
          </dl>
        )
      )}

      <section className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">Linked Claims</h3>
        {!observation.claimLinks || observation.claimLinks.length === 0 ? (
          <p className="text-sm text-stone-500">
            No claims linked yet. Use <strong>Create Claim From Observation</strong> to build an
            interpretive claim from this observation.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm">
            {observation.claimLinks.map((link) => (
              <li key={link.linkId} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {link.claim ? (
                      <>
                        <Link
                          to={`/claims/${encodeURIComponent(link.claim.claimId)}`}
                          className="font-mono text-xs font-medium text-stone-800 hover:underline"
                        >
                          {link.claim.claimId}
                        </Link>
                        <p className="mt-1 text-sm text-stone-800">
                          <Link
                            to={`/claims/${encodeURIComponent(link.claim.claimId)}`}
                            className="hover:underline"
                          >
                            {link.claim.claimText}
                          </Link>
                        </p>
                      </>
                    ) : (
                      <p className="font-mono text-xs">{link.claimId}</p>
                    )}
                  </div>
                  <RelationshipBadge relationship={link.relationshipType} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
