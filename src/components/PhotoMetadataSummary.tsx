import type { PhotoMetadata } from "../lib/photoMetadata";

type Props = {
  metadata: PhotoMetadata;
  className?: string;
};

export function PhotoMetadataSummary({ metadata, className = "" }: Props) {
  const rows = [
    { label: "Photographer", value: metadata.photographer },
    { label: "Date", value: metadata.photoDate },
    { label: "Location", value: metadata.photoLocation },
    { label: "Copyright", value: metadata.copyrightHolder },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;

  return (
    <dl className={`grid gap-2 text-sm sm:grid-cols-2 ${className}`}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs font-medium text-stone-500">{row.label}</dt>
          <dd className="text-stone-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
