import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { normalizeDisplayText } from "../lib/normalizeDisplayText";

type ViewMode = "formatted" | "raw";

type Props = {
  content: string;
  defaultMode?: ViewMode;
  className?: string;
  showToggle?: boolean;
};

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 border-b border-stone-200 pb-2 text-2xl font-bold text-stone-900 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-xl font-semibold text-stone-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold text-stone-900 first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-1 mt-3 text-base font-semibold text-stone-900 first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-3 leading-relaxed text-stone-800 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 text-stone-800">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-stone-800">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-stone-300 pl-4 italic text-stone-700">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-stone-200" />,
  strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-xs text-stone-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-md bg-stone-100 p-3 font-mono text-xs text-stone-800">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-800 underline hover:text-sky-950"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-stone-200 bg-stone-50 px-3 py-2 text-left font-semibold text-stone-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-stone-200 px-3 py-2 text-stone-800">{children}</td>
  ),
};

export function FormattedTextContent({
  content,
  defaultMode = "formatted",
  className = "",
  showToggle = true,
}: Props) {
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const displayText = normalizeDisplayText(content);

  return (
    <div className={className}>
      {showToggle && (
        <div className="mb-3 flex gap-1 rounded-md border border-stone-200 bg-stone-50 p-1 w-fit">
          <button
            type="button"
            onClick={() => setMode("formatted")}
            className={[
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              mode === "formatted"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-600 hover:text-stone-900",
            ].join(" ")}
          >
            Formatted
          </button>
          <button
            type="button"
            onClick={() => setMode("raw")}
            className={[
              "rounded px-3 py-1 text-xs font-medium transition-colors",
              mode === "raw"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-600 hover:text-stone-900",
            ].join(" ")}
          >
            Raw
          </button>
        </div>
      )}

      {mode === "formatted" ? (
        <div className="max-w-none rounded-md border border-stone-200 bg-white px-4 py-3 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {displayText}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 px-4 py-3 font-mono text-xs leading-relaxed text-stone-800">
          {displayText}
        </pre>
      )}
    </div>
  );
}
