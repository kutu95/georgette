import { formatClaimTier } from "../lib/format";

const STYLES: Record<string, string> = {
  TIER_1: "bg-violet-100 text-violet-900 ring-1 ring-violet-200",
  TIER_2: "bg-sky-100 text-sky-900 ring-1 ring-sky-200",
  TIER_3: "bg-stone-200 text-stone-700",
};

type Props = {
  tier: string;
};

export function ClaimTierBadge({ tier }: Props) {
  const style = STYLES[tier] ?? "bg-stone-100 text-stone-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {formatClaimTier(tier)}
    </span>
  );
}
