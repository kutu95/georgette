import { formatRelationship } from "../lib/format";

const STYLES: Record<string, string> = {
  SUPPORTS: "bg-green-100 text-green-800",
  CONTRADICTS: "bg-red-100 text-red-800",
  QUALIFIES: "bg-amber-100 text-amber-800",
  MENTIONS: "bg-stone-200 text-stone-700",
};

type Props = {
  relationship: string;
};

export function RelationshipBadge({ relationship }: Props) {
  const style = STYLES[relationship] ?? "bg-stone-100 text-stone-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {formatRelationship(relationship)}
    </span>
  );
}
