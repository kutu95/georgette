import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, type EvidenceLinkRecord, type ObservationRecord, type SourceDocumentRecord, type SourceRecord } from "../lib/api";
import { CreateClaimFromSourceForm } from "../components/CreateClaimFromSourceForm";
import { ObservationForm } from "../components/ObservationForm";
import { SourceDocumentsPanel } from "../components/SourceDocumentsPanel";
import { RelationshipBadge } from "../components/RelationshipBadge";
import { formatObservationConfidence } from "../lib/format";
import { sourceConfig } from "../lib/entities";

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "createdAt" || key === "updatedAt") {
    return new Date(String(value)).toLocaleString();
  }
  return String(value);
}

export function SourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const backQuery = searchParams.toString();

  const [source, setSource] = useState<SourceRecord | null>(null);
  const [referencedBy, setReferencedBy] = useState<EvidenceLinkRecord[]>([]);
  const [observations, setObservations] = useState<ObservationRecord[]>([]);
  const [documents, setDocuments] = useState<SourceDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [creatingClaim, setCreatingClaim] = useState(false);
  const [addingObservation, setAddingObservation] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [data, refs, obs, docs] = await Promise.all([
        api.getSource(id),
        api.getSourceReferencedBy(id),
        api.getSourceObservations(id),
        api.getSourceDocuments(id),
      ]);
      setSource(data);
      setReferencedBy(refs);
      setObservations(obs);
      setDocuments(docs);
      setForm({ ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load source");
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
      const payload: Record<string, unknown> = {};
      for (const field of sourceConfig.fields) {
        if (field.readOnlyOnEdit) continue;
        let val = form[field.key];
        if (field.type === "number" && val !== "" && val != null) {
          val = Number(val);
        }
        if (val !== "" && val != null) {
          payload[field.key] = val;
        } else if (field.type !== "select") {
          payload[field.key] = null;
        }
      }
      const updated = await api.update<SourceRecord>("sources", id, payload);
      setSource(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || !confirm(`Delete source ${id}?`)) return;
    try {
      await api.remove("sources", id);
      navigate(`/sources${backQuery ? `?${backQuery}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Loading source…</p>;
  }

  if (!source) {
    return (
      <div>
        <p className="text-sm text-red-700">{error ?? "Source not found"}</p>
        <Link
          to={`/sources${backQuery ? `?${backQuery}` : ""}`}
          className="mt-4 inline-block text-sm text-stone-600 hover:text-stone-900"
        >
          ← Back to sources
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to={`/sources${backQuery ? `?${backQuery}` : ""}`}
        className="mb-4 inline-block text-sm text-stone-600 hover:text-stone-900"
      >
        ← Back to sources
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{source.sourceId}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {source.suggestedStandardFileName ?? source.currentFileName ?? "Source detail"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing && !creatingClaim && !addingObservation && (
            <>
              <button
                type="button"
                onClick={() => setCreatingClaim(true)}
                className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              >
                Create Claim From Source
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Delete
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
        <CreateClaimFromSourceForm
          source={source}
          onCancel={() => setCreatingClaim(false)}
          onCreated={() => setCreatingClaim(false)}
        />
      )}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="max-w-3xl space-y-4 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
        >
          {sourceConfig.fields.map((field) => {
            if (field.readOnlyOnEdit) return null;
            const value = form[field.key] ?? "";
            if (field.type === "textarea") {
              return (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-medium text-stone-700">
                    {field.label}
                  </span>
                  <textarea
                    value={String(value)}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    rows={4}
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
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
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
                  type={field.type === "number" ? "number" : "text"}
                  value={String(value)}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            );
          })}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm({ ...source });
              }}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="max-w-3xl divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm">
          {sourceConfig.fields.map((field) => (
            <div key={field.key} className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">{field.label}</dt>
              <dd className="whitespace-pre-wrap text-sm text-stone-900 sm:col-span-2">
                {formatValue(field.key, source[field.key as keyof SourceRecord])}
              </dd>
            </div>
          ))}
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Created</dt>
            <dd className="text-sm text-stone-900 sm:col-span-2">
              {formatValue("createdAt", source.createdAt)}
            </dd>
          </div>
          <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
            <dt className="text-sm font-medium text-stone-600">Updated</dt>
            <dd className="text-sm text-stone-900 sm:col-span-2">
              {formatValue("updatedAt", source.updatedAt)}
            </dd>
          </div>
          {source.parent && (
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Parent Source</dt>
              <dd className="text-sm sm:col-span-2">
                <Link
                  to={`/sources/${encodeURIComponent(source.parent.sourceId)}`}
                  className="text-stone-800 underline hover:text-stone-600"
                >
                  {source.parent.sourceId}
                  {source.parent.currentFileName ? ` — ${source.parent.currentFileName}` : ""}
                </Link>
              </dd>
            </div>
          )}
          {source.children && source.children.length > 0 && (
            <div className="grid gap-1 px-5 py-4 sm:grid-cols-3">
              <dt className="text-sm font-medium text-stone-600">Child Sources</dt>
              <dd className="text-sm sm:col-span-2">
                <ul className="space-y-1">
                  {source.children.map((child) => (
                    <li key={child.sourceId}>
                      <Link
                        to={`/sources/${encodeURIComponent(child.sourceId)}`}
                        className="text-stone-800 underline hover:text-stone-600"
                      >
                        {child.sourceId}
                        {child.currentFileName ? ` — ${child.currentFileName}` : ""}
                      </Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      )}

      <SourceDocumentsPanel
        sourceId={source.sourceId}
        documents={documents}
        onChange={load}
      />

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-stone-900">Observations</h3>
          {!addingObservation && !editing && !creatingClaim && (
            <button
              type="button"
              onClick={() => setAddingObservation(true)}
              className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              Add Observation
            </button>
          )}
        </div>

        {addingObservation && source && (
          <div className="mb-6">
            <ObservationForm
              source={source}
              onSaved={(obs) => {
                setObservations((prev) => [obs, ...prev]);
                setAddingObservation(false);
              }}
              onCancel={() => setAddingObservation(false)}
            />
          </div>
        )}

        {observations.length === 0 ? (
          <p className="text-sm text-stone-500">
            No observations recorded for this source yet. Add what the source actually says before
            building claims.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm">
            {observations.map((obs) => (
              <li key={obs.observationId} className="px-5 py-4">
                <Link
                  to={`/observations/${encodeURIComponent(obs.observationId)}`}
                  className="text-sm text-stone-900 hover:underline"
                >
                  {obs.observationText}
                </Link>
                <p className="mt-1 text-xs text-stone-500">
                  {formatObservationConfidence(obs.confidence)}
                  {obs.pageOrFolio ? ` · ${obs.pageOrFolio}` : ""}
                  {(obs.claimLinks?.length ?? 0) > 0
                    ? ` · ${obs.claimLinks!.length} linked claim${obs.claimLinks!.length === 1 ? "" : "s"}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">
          Claims Derived From This Source
        </h3>
        {referencedBy.length === 0 ? (
          <p className="text-sm text-stone-500">
            No claims linked via direct evidence yet. Prefer{" "}
            <strong className="font-medium">observations → claims</strong>, or use{" "}
            <strong className="font-medium">Create Claim From Source</strong> for legacy linking.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white shadow-sm">
            {referencedBy.map((link) => (
              <li key={link.evidenceId} className="px-5 py-4">
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
                      <p className="font-mono text-xs text-stone-600">{link.claimId}</p>
                    )}
                  </div>
                  <RelationshipBadge relationship={link.relationship} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
