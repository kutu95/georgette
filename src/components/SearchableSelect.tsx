import { useCallback, useEffect, useId, useRef, useState } from "react";

export type SearchableOption = {
  id: string;
  label: string;
};

type Props = {
  label: string;
  placeholder?: string;
  value: string | null;
  displayLabel?: string | null;
  onSearch: (query: string) => Promise<SearchableOption[]>;
  onChange: (id: string | null, option?: SearchableOption) => void;
  onResolve?: (id: string) => Promise<SearchableOption | null>;
  required?: boolean;
  disabled?: boolean;
};

export function SearchableSelect({
  label,
  placeholder = "Type to search…",
  value,
  displayLabel,
  onSearch,
  onChange,
  onResolve,
  required,
  disabled,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(displayLabel ?? "");
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setQuery(displayLabel ?? "");
  }, [displayLabel, value]);

  useEffect(() => {
    if (!value || displayLabel) return;
    if (!onResolve) return;
    onResolve(value).then((opt) => {
      if (opt) setQuery(opt.label);
    });
  }, [value, displayLabel, onResolve]);

  const runSearch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const results = await onSearch(q);
        setOptions(results);
        setHighlight(0);
      } finally {
        setLoading(false);
      }
    },
    [onSearch],
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, open, runSearch]);

  function selectOption(opt: SearchableOption) {
    onChange(opt.id, opt);
    setQuery(opt.label);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && options[highlight]) {
      e.preventDefault();
      selectOption(options[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
        />
      </label>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-stone-500">Searching…</li>
          )}
          {!loading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-stone-500">No matches</li>
          )}
          {!loading &&
            options.map((opt, i) => (
              <li
                key={opt.id}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(opt)}
                onMouseEnter={() => setHighlight(i)}
                className={[
                  "cursor-pointer px-3 py-2 text-sm",
                  i === highlight ? "bg-stone-100 text-stone-900" : "text-stone-800",
                ].join(" ")}
              >
                {opt.label}
              </li>
            ))}
        </ul>
      )}

      {value && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
            inputRef.current?.focus();
          }}
          className="mt-1 text-xs text-stone-500 hover:text-stone-800"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}
