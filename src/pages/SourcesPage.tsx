import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DocumentViewModal } from "../components/DocumentViewModal";
import { PasteTextSourceForm } from "../components/PasteTextSourceForm";
import { ParentSourceSelect } from "../components/ParentSourceSelect";
import { ResizableTh } from "../components/ResizableTh";
import { SourceDocumentPickerModal } from "../components/SourceDocumentPickerModal";
import { SourceIdField } from "../components/SourceIdField";
import { ViewIconButton } from "../components/ViewIconButton";
import { useResizableColumns } from "../hooks/useResizableColumns";
import { api, type SourceDocumentRecord, type SourceFilterOptions, type SourceRecord } from "../lib/api";
import type { ViewableDocument } from "../lib/documentView";
import { formatSourceLabel } from "../lib/format";
import { sourceConfig } from "../lib/entities";
import { normalizeSourceIdInput } from "../lib/sourceId";

const SORT_OPTIONS = [
  { value: "source_id", label: "Source ID" },
  { value: "suggested_standard_file_name", label: "Standard File Name" },
  { value: "category", label: "Category" },
  { value: "importance", label: "Importance" },
] as const;

const SOURCE_TABLE_COLUMNS = [
  { id: "sourceId", label: "ID", defaultWidth: 140 },
  { id: "view", label: "", defaultWidth: 52 },
  { id: "currentFileName", label: "File Name", defaultWidth: 220 },
  { id: "suggestedStandardFileName", label: "Standard Name", defaultWidth: 220 },
  { id: "category", label: "Category", defaultWidth: 130 },
  { id: "importance", label: "Importance", defaultWidth: 110 },
  { id: "originalOrDerived", label: "Original/Derived", defaultWidth: 130 },
] as const;

const SOURCE_TABLE_STORAGE_KEY = "georgette.sources-table.column-widths";


export function SourcesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const importance = searchParams.get("importance") ?? "";
  const originalOrDerived = searchParams.get("original_or_derived") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "source_id";
  const sortDir = (searchParams.get("sortDir") ?? "asc") as "asc" | "desc";

  const [items, setItems] = useState<SourceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [filtered, setFiltered] = useState(0);
  const [filterOptions, setFilterOptions] = useState<SourceFilterOptions>({
    categories: [],
    importances: [],
    originalOrDerived: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPasteForm, setShowPasteForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<ViewableDocument | null>(null);
  const [documentPicker, setDocumentPicker] = useState<{
    sourceLabel: string;
    documents: SourceDocumentRecord[];
  } | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);

  const { widths, startResize, resetWidths } = useResizableColumns(
    SOURCE_TABLE_STORAGE_KEY,
    SOURCE_TABLE_COLUMNS.map((col) => ({ id: col.id, defaultWidth: col.defaultWidth })),
  );

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, options] = await Promise.all([
        api.searchSources({ q, category, importance, originalOrDerived, sortBy, sortDir }),
        api.getSourceFilterOptions(),
      ]);
      setItems(result.items);
      setTotal(result.total);
      setFiltered(result.filtered);
      setFilterOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoading(false);
    }
  }, [q, category, importance, originalOrDerived, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    const empty: Record<string, unknown> = {};
    for (const field of sourceConfig.fields) {
      if (field.type === "select" && field.options?.length) {
        empty[field.key] = field.options[0].value;
      } else {
        empty[field.key] = "";
      }
    }
    setForm(empty);
    setShowPasteForm(false);
    setShowForm(true);
  }

  function openPasteForm() {
    setShowForm(false);
    setShowPasteForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of sourceConfig.fields) {
        let val = form[field.key];
        if (field.key === "sourceId" && typeof val === "string") {
          val = normalizeSourceIdInput(val);
        }
        if (field.type === "number" && val !== "" && val != null) {
          val = Number(val);
        }
        if (val !== "" && val != null) {
          payload[field.key] = val;
        }
      }
      await api.create("sources", payload);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const hasActiveFilters = Boolean(q || category || importance || originalOrDerived);

  async function handleViewSource(item: SourceRecord, e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.documentCount) {
      setViewError(`No documents uploaded for ${item.sourceId}. Add documents on the source detail page.`);
      return;
    }

    setViewError(null);

    if (item.documentCount === 1 && item.primaryDocument) {
      setViewingDocument(item.primaryDocument);
      return;
    }

    setViewLoadingId(item.sourceId);
    try {
      const documents = await api.getSourceDocuments(item.sourceId);
      const viewable = documents.filter(
        (doc) => doc.filePath && doc.documentKind !== "COMBINED_OCR",
      );
      if (viewable.length === 0) {
        setViewError(`No viewable documents for ${item.sourceId}.`);
        return;
      }
      if (viewable.length === 1) {
        setViewingDocument(viewable[0]);
        return;
      }
      setDocumentPicker({
        sourceLabel: formatSourceLabel(item),
        documents: viewable,
      });
    } catch (err) {
      setViewError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setViewLoadingId(null);
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{sourceConfig.title}</h2>
          <p className="mt-1 text-sm text-stone-600">{sourceConfig.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={openPasteForm}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Paste as Source
          </button>
          <button
            type="button"
            onClick={openNew}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Add Source
          </button>
        </div>
      </div>

      <div className="mb-6 space-y-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Search sources</span>
          <input
            type="search"
            value={q}
            onChange={(e) => updateParams({ q: e.target.value })}
            placeholder="Search ID, file names, notes…"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-stone-500">
            Searches source ID, file names, notes, category, and importance (case insensitive)
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Category</span>
            <select
              value={category}
              onChange={(e) => updateParams({ category: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {filterOptions.categories.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Importance</span>
            <select
              value={importance}
              onChange={(e) => updateParams({ importance: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All importance levels</option>
              {filterOptions.importances.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Original / Derived</span>
            <select
              value={originalOrDerived}
              onChange={(e) => updateParams({ original_or_derived: e.target.value })}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All types</option>
              {filterOptions.originalOrDerived.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => updateParams({ sortBy: e.target.value })}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Direction</span>
            <select
              value={sortDir}
              onChange={(e) => updateParams({ sortDir: e.target.value })}
              className="rounded-md border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() =>
                setSearchParams({}, { replace: true })
              }
              className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="mb-4 text-sm text-stone-600">
        {loading ? (
          "Loading…"
        ) : q || category || importance || originalOrDerived ? (
          <>
            Showing <strong>{filtered}</strong> matching sources of <strong>{total}</strong> total
          </>
        ) : (
          <>
            Showing <strong>{filtered}</strong> of <strong>{total}</strong> sources
          </>
        )}
      </p>

      {viewError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {viewError}
          <button
            type="button"
            onClick={() => setViewError(null)}
            className="ml-3 text-amber-800 underline hover:text-amber-950"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showPasteForm && (
        <PasteTextSourceForm
          onSaved={() => void load()}
          onCancel={() => setShowPasteForm(false)}
        />
      )}

      {showForm && (
        <div className="mb-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium">New Source</h3>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            {sourceConfig.fields.map((field) => {
              const value = form[field.key] ?? "";
              if (field.key === "sourceId") {
                return (
                  <SourceIdField
                    key={field.key}
                    className="sm:col-span-2"
                    value={String(value)}
                    onChange={(next) => setForm((prev) => ({ ...prev, sourceId: next }))}
                    required={field.required}
                  />
                );
              }
              if (field.key === "parentSourceId") {
                const parentId =
                  typeof value === "string" && value.trim() ? value.trim() : null;
                return (
                  <ParentSourceSelect
                    key={field.key}
                    className="sm:col-span-2"
                    value={parentId}
                    excludeSourceId={
                      typeof form.sourceId === "string" ? form.sourceId.trim() || null : null
                    }
                    onChange={(id) =>
                      setForm((prev) => ({ ...prev, parentSourceId: id ?? "" }))
                    }
                  />
                );
              }
              if (field.type === "textarea") {
                return (
                  <label key={field.key} className="block sm:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-stone-700">
                      {field.label}
                    </span>
                    <textarea
                      value={String(value)}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      rows={3}
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
                  <span className="mb-1 block text-sm font-medium text-stone-700">
                    {field.label}
                    {field.required && <span className="text-red-600"> *</span>}
                  </span>
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(value)}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    required={field.required}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              );
            })}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-stone-500">No sources match your search.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-stone-500">
            Drag the right edge of a column header to resize.{" "}
            <button
              type="button"
              onClick={resetWidths}
              className="text-stone-600 underline hover:text-stone-900"
            >
              Reset column widths
            </button>
          </p>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm" style={{ tableLayout: "fixed" }}>
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  {SOURCE_TABLE_COLUMNS.map((col) => (
                    <ResizableTh
                      key={col.id}
                      columnId={col.id}
                      width={widths[col.id]}
                      onResizeStart={startResize}
                    >
                      {col.id === "view" ? (
                        <span className="sr-only">View</span>
                      ) : (
                        col.label
                      )}
                    </ResizableTh>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr
                    key={item.sourceId}
                    onClick={() =>
                      navigate(`/sources/${encodeURIComponent(item.sourceId)}?${searchParams.toString()}`)
                    }
                    className="cursor-pointer hover:bg-stone-50"
                  >
                    <td
                      className="truncate px-4 py-3 font-mono text-xs text-stone-800"
                      style={{ width: widths.sourceId, maxWidth: widths.sourceId }}
                      title={item.sourceId}
                    >
                      {item.sourceId}
                    </td>
                    <td
                      className="px-2 py-2 text-center"
                      style={{ width: widths.view, maxWidth: widths.view }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ViewIconButton
                        disabled={!item.documentCount || viewLoadingId === item.sourceId}
                        label={
                          item.documentCount
                            ? `View document for ${item.sourceId}`
                            : `No document for ${item.sourceId}`
                        }
                        onClick={(e) => void handleViewSource(item, e)}
                      />
                    </td>
                    <td
                      className="truncate px-4 py-3 text-stone-800"
                      style={{ width: widths.currentFileName, maxWidth: widths.currentFileName }}
                      title={item.currentFileName ?? undefined}
                    >
                      {item.currentFileName ?? "—"}
                    </td>
                    <td
                      className="truncate px-4 py-3 text-stone-800"
                      style={{
                        width: widths.suggestedStandardFileName,
                        maxWidth: widths.suggestedStandardFileName,
                      }}
                      title={item.suggestedStandardFileName ?? undefined}
                    >
                      {item.suggestedStandardFileName ?? "—"}
                    </td>
                    <td
                      className="truncate px-4 py-3 text-stone-800"
                      style={{ width: widths.category, maxWidth: widths.category }}
                      title={item.category ?? undefined}
                    >
                      {item.category ?? "—"}
                    </td>
                    <td
                      className="truncate px-4 py-3 text-stone-800"
                      style={{ width: widths.importance, maxWidth: widths.importance }}
                      title={item.importance ?? undefined}
                    >
                      {item.importance ?? "—"}
                    </td>
                    <td
                      className="truncate px-4 py-3 text-stone-800"
                      style={{
                        width: widths.originalOrDerived,
                        maxWidth: widths.originalOrDerived,
                      }}
                      title={item.originalOrDerived ?? undefined}
                    >
                      {item.originalOrDerived ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {documentPicker && (
        <SourceDocumentPickerModal
          sourceLabel={documentPicker.sourceLabel}
          documents={documentPicker.documents}
          onSelect={(doc) => {
            setDocumentPicker(null);
            setViewingDocument(doc);
          }}
          onClose={() => setDocumentPicker(null)}
        />
      )}

      {viewingDocument && (
        <DocumentViewModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
