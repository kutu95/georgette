type Props = {
  columnId: string;
  width: number;
  onResizeStart: (columnId: string, e: React.MouseEvent) => void;
  children: React.ReactNode;
};

export function ResizableTh({ columnId, width, onResizeStart, children }: Props) {
  return (
    <th
      className="relative whitespace-nowrap px-4 py-3 font-medium text-stone-700"
      style={{ width, minWidth: width, maxWidth: width }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${typeof children === "string" ? children : columnId} column`}
        className="absolute -right-px top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none hover:bg-stone-400/60 active:bg-stone-500/70"
        onMouseDown={(e) => onResizeStart(columnId, e)}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
}
