import { useCallback, useEffect, useState } from "react";
import {
  api,
  type ClaimRecord,
  type EvidenceLinkRecord,
  type SourceRecord,
} from "../lib/api";
import { formatClaimLabel, formatSourceLabel } from "../lib/format";
import { invalidateStats } from "../lib/statsEvents";
import { SearchableSelect } from "./SearchableSelect";
import { SourceMultiSelect } from "./SourceMultiSelect";
import { ClaimPreviewCard } from "./ClaimPreviewCard";
import { SourcePreviewCard } from "./SourcePreviewCard";

const RELATIONSHIPS = [
  { value: "SUPPORTS", label: "Supports" },
  { value: "CONTRADICTS", label: "Contradicts" },
  { value: "QUALIFIES", label: "Qualifies" },
  { value: "MENTIONS", label: "Mentions" },
] as const;

type Props = {
  initialClaimId?: string | null;
  initialSourceId?: string | null;
  evidenceId?: string;
  onSaved: () => void;
  onCancel: () => void;
  saveButtonLabel?: string;
  cancelButtonLabel?: string;
  multiSource?: boolean;
  excludeSourceIds?: string[];
};

export function EvidenceLinkForm({
  initialClaimId,
  initialSourceId,
  evidenceId,
  onSaved,
  onCancel,
  saveButtonLabel,
  cancelButtonLabel,
  multiSource = false,
  excludeSourceIds = [],
}: Props) {
  const [claimId, setClaimId] = useState<string | null>(initialClaimId ?? null);
  const [sourceId, setSourceId] = useState<string | null>(initialSourceId ?? null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [claimPreview, setClaimPreview] = useState<ClaimRecord | null>(null);
  const [sourcePreview, setSourcePreview] = useState<SourceRecord | null>(null);
  const [claimLabel, setClaimLabel] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [relationship, setRelationship] = useState("SUPPORTS");
  const [pageOrFolio, setPageOrFolio] = useState("");
  const [quote, setQuote] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    if (evidenceId) {
      const link = await api.get<EvidenceLinkRecord>("evidence-links", evidenceId);
      setClaimId(link.claimId);
      setSourceId(link.sourceId);
      setRelationship(link.relationship);
      setPageOrFolio(link.pageOrFolio ?? "");
      setQuote(link.quote ?? "");
      setNotes(link.notes ?? "");
      const [claim, source] = await Promise.all([
        api.getClaim(link.claimId),
        api.getSource(link.sourceId),
      ]);
      setClaimPreview(claim);
      setSourcePreview(source);
      setClaimLabel(formatClaimLabel(claim));
      setSourceLabel(formatSourceLabel(source));
      return;
    }
    if (initialClaimId) {
      const claim = await api.getClaim(initialClaimId);
      setClaimPreview(claim);
      setClaimLabel(formatClaimLabel(claim));
    }
    if (initialSourceId) {
      const source = await api.getSource(initialSourceId);
      setSourcePreview(source);
      setSourceLabel(formatSourceLabel(source));
    }
  }, [initialClaimId, initialSourceId, evidenceId]);

  useEffect(() => {
    loadInitial().catch(() => undefined);
  }, [loadInitial]);

  async function handleClaimChange(id: string | null) {
    setClaimId(id);
    if (id) {
      const claim = await api.getClaim(id);
      setClaimPreview(claim);
      setClaimLabel(formatClaimLabel(claim));
    } else {
      setClaimPreview(null);
      setClaimLabel(null);
    }
  }

  async function handleSourceChange(id: string | null) {
    setSourceId(id);
    if (id) {
      const source = await api.getSource(id);
      setSourcePreview(source);
      setSourceLabel(formatSourceLabel(source));
    } else {
      setSourcePreview(null);
      setSourceLabel(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimId) {
      setError("Select a claim.");
      return;
    }

    const sourceIds = multiSource && !evidenceId
      ? Array.from(selectedSourceIds)
      : sourceId
        ? [sourceId]
        : [];

    if (sourceIds.length === 0) {
      setError(multiSource ? "Select at least one source." : "Select a source.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const bodyBase = {
        claimId,
        relationship,
        pageOrFolio: pageOrFolio || null,
        quote: quote || null,
        notes: notes || null,
      };

      if (evidenceId) {
        await api.update("evidence-links", evidenceId, {
          ...bodyBase,
          sourceId: sourceIds[0],
        });
      } else if (multiSource) {
        for (const sid of sourceIds) {
          await api.create("evidence-links", { ...bodyBase, sourceId: sid });
        }
      } else {
        await api.create("evidence-links", { ...bodyBase, sourceId: sourceIds[0] });
      }

      invalidateStats();
      if (multiSource) {
        setSelectedSourceIds(new Set());
        setSourcePreview(null);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const claimLocked = Boolean(initialClaimId && !evidenceId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SearchableSelect
            label="Claim"
            required
            value={claimId}
            displayLabel={claimLabel}
            disabled={claimLocked}
            placeholder="Search by claim ID or text…"
            onSearch={async (q) => {
              const { items } = await api.searchClaims(q);
              return items.map((c) => ({ id: c.claimId, label: formatClaimLabel(c) }));
            }}
            onResolve={async (id) => {
              const claim = await api.getClaim(id);
              return { id: claim.claimId, label: formatClaimLabel(claim) };
            }}
            onChange={(id) => handleClaimChange(id)}
          />
          {claimPreview && <ClaimPreviewCard claim={claimPreview} />}
        </div>

        <div className="space-y-4">
          {multiSource && !evidenceId ? (
            <>
              <SourceMultiSelect
                selectedIds={selectedSourceIds}
                onChange={setSelectedSourceIds}
                excludeSourceIds={excludeSourceIds}
                onPreviewSource={setSourcePreview}
              />
              {sourcePreview && <SourcePreviewCard source={sourcePreview} />}
            </>
          ) : (
            <>
              <SearchableSelect
                label="Source"
                required
                value={sourceId}
                displayLabel={sourceLabel}
                placeholder="Search by ID, filename, or notes…"
                onSearch={async (q) => {
                  const { items } = await api.searchSourcesAutocomplete(q);
                  return items.map((s) => ({ id: s.sourceId, label: formatSourceLabel(s) }));
                }}
                onResolve={async (id) => {
                  const source = await api.getSource(id);
                  return { id: source.sourceId, label: formatSourceLabel(source) };
                }}
                onChange={(id) => handleSourceChange(id)}
              />
              {sourcePreview && <SourcePreviewCard source={sourcePreview} />}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Relationship</span>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Page or Folio</span>
          <input
            type="text"
            value={pageOrFolio}
            onChange={(e) => setPageOrFolio(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-stone-700">Quote</span>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-stone-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || (multiSource && !evidenceId && selectedSourceIds.size === 0)}
          className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : saveButtonLabel ??
              (evidenceId
                ? "Update Evidence"
                : multiSource
                  ? selectedSourceIds.size > 0
                    ? `Link ${selectedSourceIds.size} Source${selectedSourceIds.size === 1 ? "" : "s"}`
                    : "Link Selected Sources"
                  : "Save Evidence")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
        >
          {cancelButtonLabel ?? "Cancel"}
        </button>
      </div>
    </form>
  );
}
