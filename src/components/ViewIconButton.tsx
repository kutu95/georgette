type Props = {
  disabled?: boolean;
  label: string;
  onClick: (e: React.MouseEvent) => void;
};

export function ViewIconButton({ disabled, label, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "inline-flex rounded-md p-1.5 transition-colors",
        disabled
          ? "cursor-not-allowed text-stone-300"
          : "text-stone-600 hover:bg-stone-200 hover:text-stone-900",
      ].join(" ")}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}
