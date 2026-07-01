import type { PhotoMetadataInput } from "../lib/photoMetadata";

type Props = {
  values: PhotoMetadataInput;
  onChange: (field: keyof PhotoMetadataInput, value: string) => void;
  idPrefix?: string;
  compact?: boolean;
};

export function PhotoMetadataFields({
  values,
  onChange,
  idPrefix = "photo",
  compact = false,
}: Props) {
  const gridClass = compact
    ? "grid gap-3 sm:grid-cols-2"
    : "grid gap-3 sm:grid-cols-2";

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-stone-700">Photo details</legend>
      <div className={gridClass}>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Photographer</span>
          <input
            id={`${idPrefix}-photographer`}
            type="text"
            value={values.photographer ?? ""}
            onChange={(e) => onChange("photographer", e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Date</span>
          <input
            id={`${idPrefix}-date`}
            type="text"
            value={values.photoDate ?? ""}
            onChange={(e) => onChange("photoDate", e.target.value)}
            placeholder="e.g. 12 March 1876"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Location</span>
          <input
            id={`${idPrefix}-location`}
            type="text"
            value={values.photoLocation ?? ""}
            onChange={(e) => onChange("photoLocation", e.target.value)}
            placeholder="e.g. Mullaloo Beach, WA"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-stone-600">Copyright holder</span>
          <input
            id={`${idPrefix}-copyright`}
            type="text"
            value={values.copyrightHolder ?? ""}
            onChange={(e) => onChange("copyrightHolder", e.target.value)}
            placeholder="e.g. State Library of WA"
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </fieldset>
  );
}
