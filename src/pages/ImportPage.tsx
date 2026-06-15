import { useState } from "react";
import { api } from "../lib/api";

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    errors: { row: number; error: string }[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.importSources(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-stone-900">Import Sources</h2>
      <p className="mt-1 text-sm text-stone-600">
        Upload a CSV to create or update records in <code className="text-xs">georgette.sources</code>.
        Existing <code className="text-xs">source_id</code> values are updated; new IDs are inserted.
      </p>

      <div className="mt-6 max-w-2xl rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="mb-2 font-medium text-stone-800">Required CSV columns</h3>
        <p className="mb-4 font-mono text-xs text-stone-600">
          source_id, current_file_name, suggested_standard_file_name, document_type, category,
          original_or_derived, importance, notes
        </p>

        <form onSubmit={handleImport} className="space-y-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-stone-600 file:mr-4 file:rounded-md file:border-0 file:bg-stone-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
          />
          <button
            type="submit"
            disabled={!file || loading}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {loading ? "Importing…" : "Import CSV"}
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-4 max-w-2xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 max-w-2xl rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p>
            Processed <strong>{result.total}</strong> rows:{" "}
            <strong>{result.created}</strong> created, <strong>{result.updated}</strong> updated.
          </p>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="font-medium text-red-800">{result.errors.length} errors:</p>
              <ul className="mt-1 list-inside list-disc text-red-700">
                {result.errors.map((err) => (
                  <li key={`${err.row}-${err.error}`}>
                    Row {err.row}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
