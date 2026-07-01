import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  isStandardSourceId,
  normalizeSourceIdInput,
  SOURCE_ID_FORMAT_HINT,
} from "../lib/sourceId";

type Props = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  autoFill?: boolean;
  className?: string;
};

export function SourceIdField({
  value,
  onChange,
  required = false,
  disabled = false,
  autoFill = true,
  className = "",
}: Props) {
  const [suggested, setSuggested] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getNextSourceId()
      .then(({ nextSourceId }) => {
        if (cancelled) return;
        setSuggested(nextSourceId);
        if (autoFill && !value.trim()) onChange(nextSourceId);
      })
      .catch(() => {
        if (!cancelled) setSuggested(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleBlur() {
    if (!value.trim()) return;
    const normalized = normalizeSourceIdInput(value);
    if (normalized !== value) onChange(normalized);
  }

  const showWarning = value.trim() && !isStandardSourceId(value);
  const showUseSuggested = suggested && value.trim() !== suggested;

  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-stone-700">
        Source ID
        {required && <span className="text-red-600"> *</span>}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          required={required}
          disabled={disabled || loading}
          placeholder={loading ? "Loading next ID…" : "SRC-0001"}
          className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 font-mono text-sm"
          aria-describedby="source-id-hint"
        />
        {showUseSuggested && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(suggested)}
            className="shrink-0 rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Use {suggested}
          </button>
        )}
      </div>
      <span id="source-id-hint" className="mt-1 block text-xs text-stone-500">
        {loading
          ? "Finding the next available ID…"
          : suggested
            ? `${SOURCE_ID_FORMAT_HINT} Next available: ${suggested}.`
            : SOURCE_ID_FORMAT_HINT}
      </span>
      {showWarning && (
        <span className="mt-1 block text-xs text-amber-800">
          This ID does not match the standard SRC-0001 format. You can still use it, but the
          suggested format keeps IDs consistent.
        </span>
      )}
    </label>
  );
}
