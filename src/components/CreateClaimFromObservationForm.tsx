import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ClaimRecord, type ObservationRecord } from "../lib/api";
import { claimConfig } from "../lib/entities";
import { formatObservationConfidence } from "../lib/format";
import { invalidateStats } from "../lib/statsEvents";
import { SourcePreviewCard } from "./SourcePreviewCard";

const RELATIONSHIPS = [
  { value: "SUPPORTS", label: "Supports" },
  { value: "CONTRADICTS", label: "Contradicts" },
  { value: "QUALIFIES", label: "Qualifies" },
  { value: "MENTIONS", label: "Mentions" },
] as const;

type Props = {
  observation: ObservationRecord;
  onCancel: () => void;
};

export function CreateClaimFromObservationForm({ observation, onCancel }: Props) {
  const navigate = useNavigate();
  const [claimText, setClaimText] = useState("");
  const [topic, setTopic] = useState("");
  const [confidence, setConfidence] = useState("LOW");
  const [notes, setNotes] = useState("");
  const [relationshipType, setRelationshipType] = useState("SUPPORTS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      await api.createObservationClaimLink(observation.observationId, {
        claimId: claim.claimId,
        relationshipType,
      });

      if (requestedConfidence === "HIGH") {
        await api.update<ClaimRecord>("claims", claim.claimId, {
          ...claim,
          confidence: "HIGH",
        });
      }

      invalidateStats();
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
        <h3 className="text-lg font-semibold text-stone-900">Create Claim From Observation</h3>
        <p className="mt-1 text-sm text-stone-600">
          Build an interpretive claim from this factual observation. The observation is linked
          automatically.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
        <h4 className="mb-2 font-medium text-stone-800">Observation</h4>
        <p className="text-stone-900">{observation.observationText}</p>
        <p className="mt-2 text-xs text-stone-500">
          Confidence: {formatObservationConfidence(observation.confidence)}
          {observation.pageOrFolio ? ` · ${observation.pageOrFolio}` : ""}
        </p>
      </div>

      {observation.source && <SourcePreviewCard source={observation.source} />}

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Claim Text *</span>
          <textarea
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            required
            rows={4}
            placeholder="Your interpretive claim or conclusion…"
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
              Observation relationship
            </span>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {RELATIONSHIPS.map((r) => (
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
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Claim & Link Observation"}
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
