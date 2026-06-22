import { prisma } from "./db.js";

const SHIP_FEATURES = [
  {
    featureId: "SF-0001",
    featureName: "No bowsprit",
    category: "RIGGING" as const,
    visualImpact: "CRITICAL" as const,
  },
  {
    featureId: "SF-0002",
    featureName: "Compound steam engine",
    category: "MACHINERY" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0003",
    featureName: "Single screw propeller",
    category: "MACHINERY" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0004",
    featureName: "Foremast carried topsail",
    category: "RIGGING" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0005",
    featureName: "Lifeboat carried upright",
    category: "BOATS" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0006",
    featureName: "Gig carried inverted",
    category: "BOATS" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0007",
    featureName: "Pinnace carried inverted",
    category: "BOATS" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0008",
    featureName: "Quarterdeck approximately 19.2m",
    category: "DIMENSIONS" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0009",
    featureName: "Forecastle approximately 6.9m",
    category: "DIMENSIONS" as const,
    visualImpact: "MAJOR" as const,
  },
  {
    featureId: "SF-0010",
    featureName: "Iron clinker-plated hull",
    category: "HULL" as const,
    visualImpact: "CRITICAL" as const,
  },
] as const;

export async function seedShipFeatures(): Promise<void> {
  for (const seed of SHIP_FEATURES) {
    const existing = await prisma.shipFeature.findUnique({
      where: { featureId: seed.featureId },
    });
    if (existing) continue;

    await prisma.shipFeature.create({
      data: {
        featureId: seed.featureId,
        featureName: seed.featureName,
        category: seed.category,
        status: "POSSIBLE",
        confidence: "MEDIUM",
        visualImpact: seed.visualImpact,
      },
    });
    console.log(`Seeded ship feature ${seed.featureId}`);
  }
}
