import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ClaimRecord, type SourceRecord } from "../lib/api";
import { claimConfig } from "../lib/entities";
import { invalidateStats } from "../lib/statsEvents";
import { SourcePreviewCard } from "./SourcePreviewCard";

const EVIDENCE_RELATIONSHIPS = [
  { value: "SUPPORTS", label: "Supports" },
  { value: "CONTRADICTS", label: "Contradicts" },
  { value: "QUALIFIES", label: "Qualifies" },
  { value: "MENTIONS", label: "Mentions" },
] as const;

type Props = {
  source: SourceRecord;
  onCancel: () => void;
  onCreated?: () => void;
};

export function CreateClaimFromSourceForm({ source, onCancel, onCreated }: Props) {
  const navigate = useNavigate();
  const [claimText, setClaimText] = useState("");
  const [topic, setTopic] = useState("");
  const [confidence, setConfidence] = useState("LOW");
  const [notes, setNotes] = useState("");
  const [relationship, setRelationship] = useState("SUPPORTS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusField = claimConfig.fields.find((f) => f.key === "status");
  const confidenceField = claimConfig.fields.find((f) => f.key === "confidence");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimText.trim()) {
      setError("Claim text is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const requestedConfidence = confidence;
    const createConfidence = requestedConfidence === "HIGH" ? "LOW" : requestedConfidence;

    try {
      const claim = await api.create<ClaimRecord>("claims", {
        claimText: claimText.trim(),
        topic: topic.trim() || null,
        claimTier: "TIER_2",
        status: "DRAFT",
        confidence: createConfidence,
        notes: notes.trim() || null,
      });

      await api.create("evidence-links", {
        claimId: claim.claimId,
        sourceId: source.sourceId,
        relationship,
      });

      if (requestedConfidence === "HIGH") {
        await api.update<ClaimRecord>("claims", claim.claimId, {
          ...claim,
          confidence: "HIGH",
        });
      }

      invalidateStats();
      onCreated?.();
      navigate(`/claims/${encodeURIComponent(claim.claimId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create claim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 max-w-3xl space-y-6 rounded-lg border border-stone-300 bg-white p-6 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-semibold text-stone-900">Create Claim From Source</h3>
        <p className="mt-1 text-sm text-stone-600">
          Record a historical observation from this source. The claim and evidence link are created
          together.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <SourcePreviewCard source={source} />

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Claim Text *</span>
          <textarea
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            required
            rows={4}
            placeholder="State the historical claim in your own words…"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            autoFocus
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Topic</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Launch, Casualties, Rescue"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Confidence</span>
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {confidenceField?.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">
              Evidence relationship
            </span>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {EVIDENCE_RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>

        <p className="text-xs text-stone-500">
          Status defaults to {statusField?.options?.find((o) => o.value === "DRAFT")?.label ?? "Draft"}.
          {requestedHighConfidenceHint(confidence)}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Claim & Link Source"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function requestedHighConfidenceHint(confidence: string): string {
  if (confidence !== "HIGH") return "";
  return " High confidence is applied after the supporting evidence link is created.";
}
