import type { ConfidenceLevel } from "@prisma/client";
import { prisma } from "./db.js";

const PRIMARY_SOURCE_VALUES = new Set([
  "original",
  "primary",
  "primary source",
]);

function isPrimarySource(originalOrDerived: string | null | undefined): boolean {
  if (!originalOrDerived) return false;
  return PRIMARY_SOURCE_VALUES.has(originalOrDerived.trim().toLowerCase());
}

export async function validateHighConfidenceClaim(
  claimId: string | undefined,
  confidence: ConfidenceLevel,
): Promise<string | null> {
  if (confidence !== "HIGH") return null;

  if (!claimId) {
    return "High confidence requires supporting evidence from a primary source. Create the claim first, add evidence, then raise confidence.";
  }

  const evidence = await prisma.evidenceLink.findMany({
    where: { claimId },
    include: { source: true },
  });

  const hasPrimarySupport = evidence.some(
    (link) =>
      link.relationship === "SUPPORTS" &&
      isPrimarySource(link.source.originalOrDerived),
  );

  if (!hasPrimarySupport) {
    return "High confidence requires at least one supporting evidence link from a primary (original) source.";
  }

  return null;
}

export async function claimHasPrimarySupport(claimId: string): Promise<boolean> {
  const links = await prisma.evidenceLink.findMany({
    where: { claimId, relationship: "SUPPORTS" },
    include: { source: true },
  });
  return links.some((link) => isPrimarySource(link.source.originalOrDerived));
}
