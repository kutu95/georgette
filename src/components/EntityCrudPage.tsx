import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { EntityConfig } from "../lib/entities";

type RecordData = Record<string, unknown>;

function cellValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  return String(value);
}

type Props = {
  config: EntityConfig;
};

export function EntityCrudPage({ config }: Props) {
  const [items, setItems] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<RecordData>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.list<RecordData>(config.resource);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [config.resource]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    const empty: RecordData = {};
    for (const field of config.fields) {
      if (field.type === "select" && field.options?.length) {
        empty[field.key] = field.options[0].value;
      } else {
        empty[field.key] = "";
      }
    }
    setForm(empty);
    setIsNew(true);
    setEditing(null);
  }

  function openEdit(item: RecordData) {
    setForm({ ...item });
    setEditing(item);
    setIsNew(false);
  }

  function closeForm() {
    setEditing(null);
    setIsNew(false);
    setForm({});
  }

  function updateField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: RecordData = {};
      for (const field of config.fields) {
        let val = form[field.key];
        if (field.type === "number" && val !== "" && val != null) {
          val = Number(val);
        }
        if (field.key === "confidence" && val === "") {
          val = null;
        }
        if (val !== "" && val != null) {
          payload[field.key] = val;
        }
      }

      if (isNew) {
        await api.create(config.resource, payload);
      } else {
        const id = String(editing?.[config.idField]);
        await api.update(config.resource, id, payload);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: RecordData) {
    const id = String(item[config.idField]);
    if (!confirm(`Delete ${config.title.slice(0, -1)} ${id}?`)) return;
    setError(null);
    try {
      await api.remove(config.resource, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const showForm = isNew || editing;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{config.title}</h2>
          <p className="mt-1 text-sm text-stone-600">{config.description}</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add {config.title.slice(0, -1)}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium">
            {isNew ? `New ${config.title.slice(0, -1)}` : "Edit Record"}
          </h3>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) => {
              const disabled = !isNew && field.readOnlyOnEdit;
              const value = form[field.key] ?? "";

              if (field.type === "textarea") {
                return (
                  <label key={field.key} className="block sm:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-stone-700">
                      {field.label}
                    </span>
                    <textarea
                      value={String(value)}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      disabled={disabled}
                      rows={3}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
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
                      onChange={(e) => updateField(field.key, e.target.value)}
                      disabled={disabled}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
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
                    onChange={(e) => updateField(field.key, e.target.value)}
                    disabled={disabled}
                    required={field.required && isNew}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
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
                onClick={closeForm}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">No records yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50">
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-medium text-stone-700">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 font-medium text-stone-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr key={String(item[config.idField])} className="hover:bg-stone-50">
                  {config.columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-stone-800">
                      {cellValue(item[col.key])}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="text-stone-600 hover:text-stone-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
