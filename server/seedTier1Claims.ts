import { prisma } from "./db.js";

const TIER1_CLAIMS = [
  {
    claimId: "T1-0001",
    claimText:
      "The accepted Grace Bussell legend differs significantly from the contemporary evidence.",
  },
  {
    claimId: "T1-0002",
    claimText:
      "Samuel Isaacs' contribution to the rescue was progressively diminished in historical memory.",
  },
  {
    claimId: "T1-0003",
    claimText:
      "The famous horseback-through-the-surf narrative exceeds what eyewitness evidence supports.",
  },
  {
    claimId: "T1-0004",
    claimText: "Captain John Godfrey's historical reputation deserves reassessment.",
  },
  {
    claimId: "T1-0005",
    claimText:
      "The Dempster brothers and gig crew performed a major rescue that has been largely overlooked.",
  },
  {
    claimId: "T1-0006",
    claimText:
      "The contemporary record contains unresolved contradictions that cannot currently be fully reconciled.",
  },
] as const;

export async function seedTier1Claims(): Promise<void> {
  for (const seed of TIER1_CLAIMS) {
    const existing = await prisma.claim.findUnique({ where: { claimId: seed.claimId } });
    if (existing) continue;

    await prisma.claim.create({
      data: {
        claimId: seed.claimId,
        claimText: seed.claimText,
        claimTier: "TIER_1",
        status: "DRAFT",
        confidence: "UNKNOWN",
      },
    });
    console.log(`Seeded Tier 1 claim ${seed.claimId}`);
  }
}
