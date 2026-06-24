import { useCallback, useEffect, useRef, useState } from "react";

export type ResizableColumnDef = {
  id: string;
  defaultWidth: number;
};

const MIN_WIDTH = 60;

function loadWidths(
  storageKey: string,
  columns: ResizableColumnDef[],
): Record<string, number> {
  const defaults = Object.fromEntries(columns.map((col) => [col.id, col.defaultWidth]));
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored) as Record<string, number>;
    return Object.fromEntries(
      columns.map((col) => [
        col.id,
        typeof parsed[col.id] === "number" && parsed[col.id] >= MIN_WIDTH
          ? parsed[col.id]
          : col.defaultWidth,
      ]),
    );
  } catch {
    return defaults;
  }
}

export function useResizableColumns(storageKey: string, columns: ResizableColumnDef[]) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    loadWidths(storageKey, columns),
  );
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const resizingRef = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    widthsRef.current = widths;
    localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [storageKey, widths]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const resizing = resizingRef.current;
      if (!resizing) return;
      const nextWidth = Math.max(MIN_WIDTH, resizing.startWidth + (e.clientX - resizing.startX));
      setWidths((current) => ({ ...current, [resizing.id]: nextWidth }));
    }

    function onMouseUp() {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const startResize = useCallback(
    (columnId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizingRef.current = {
        id: columnId,
        startX: e.clientX,
        startWidth: widthsRef.current[columnId] ?? MIN_WIDTH,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  const resetWidths = useCallback(() => {
    setWidths(Object.fromEntries(columns.map((col) => [col.id, col.defaultWidth])));
  }, [columns]);

  return { widths, startResize, resetWidths };
}
