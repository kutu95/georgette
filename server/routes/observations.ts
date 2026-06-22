import { Router, type Request, type Response } from "express";
import type { EvidenceRelationship, ObservationConfidence, Prisma } from "@prisma/client";
import { prisma } from "../db.js";

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

const sourceSelect = {
  sourceId: true,
  currentFileName: true,
  suggestedStandardFileName: true,
  category: true,
  importance: true,
  documentType: true,
} as const;

const claimSelect = {
  claimId: true,
  claimText: true,
  status: true,
  confidence: true,
  claimTier: true,
} as const;

function buildListWhere(query: Request["query"]): Prisma.ObservationWhereInput {
  const and: Prisma.ObservationWhereInput[] = [];
  const q = typeof query.q === "string" ? query.q.trim() : "";

  if (q) {
    and.push({
      OR: [
        { observationId: { contains: q, mode: "insensitive" } },
        { observationText: { contains: q, mode: "insensitive" } },
        { quote: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { source: { sourceId: { contains: q, mode: "insensitive" } } },
        { source: { currentFileName: { contains: q, mode: "insensitive" } } },
        {
          source: { suggestedStandardFileName: { contains: q, mode: "insensitive" } },
        },
      ],
    });
  }

  const excludeClaimId =
    typeof query.excludeClaimId === "string" ? query.excludeClaimId.trim() : "";
  if (excludeClaimId) {
    and.push({
      NOT: { claimLinks: { some: { claimId: excludeClaimId } } },
    });
  }

  const excludeFeatureId =
    typeof query.excludeFeatureId === "string" ? query.excludeFeatureId.trim() : "";
  if (excludeFeatureId) {
    and.push({
      NOT: { shipFeatureLinks: { some: { featureId: excludeFeatureId } } },
    });
  }

  const sourceId = typeof query.sourceId === "string" ? query.sourceId.trim() : "";
  if (sourceId) and.push({ sourceId });

  const confidence =
    typeof query.confidence === "string" ? query.confidence.trim() : "";
  if (confidence) {
    and.push({ confidence: confidence as ObservationConfidence });
  }

  const unlinked = query.unlinked === "1" || query.unlinked === "true";
  if (unlinked) {
    and.push({ claimLinks: { none: {} } });
  }

  return and.length > 0 ? { AND: and } : {};
}

export const observationsRouter = Router();

observationsRouter.get("/", async (req, res) => {
  try {
    const where = buildListWhere(req.query);
    const [total, filtered, items] = await Promise.all([
      prisma.observation.count(),
      prisma.observation.count({ where }),
      prisma.observation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          source: { select: sourceSelect },
          claimLinks: {
            include: { claim: { select: claimSelect } },
          },
        },
      }),
    ]);
    res.json({ items, total, filtered });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to list observations");
  }
});

observationsRouter.get("/:id/claims", async (req, res) => {
  try {
    const items = await prisma.observationClaimLink.findMany({
      where: { observationId: req.params.id },
      include: { claim: { select: claimSelect } },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to load linked claims");
  }
});

observationsRouter.get("/:id", async (req, res) => {
  try {
    const item = await prisma.observation.findUnique({
      where: { observationId: req.params.id },
      include: {
        source: { select: sourceSelect },
        claimLinks: {
          include: { claim: { select: claimSelect } },
        },
      },
    });
    if (!item) return sendError(res, 404, "Observation not found");
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch observation");
  }
});

observationsRouter.post("/", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
    const observationText =
      typeof body.observationText === "string" ? body.observationText.trim() : "";

    if (!sourceId) return sendError(res, 400, "sourceId is required");
    if (!observationText) return sendError(res, 400, "observationText is required");

    const source = await prisma.source.findUnique({ where: { sourceId } });
    if (!source) return sendError(res, 400, "Source not found");

    const item = await prisma.observation.create({
      data: {
        sourceId,
        observationText,
        pageOrFolio:
          typeof body.pageOrFolio === "string" ? body.pageOrFolio.trim() || null : null,
        quote: typeof body.quote === "string" ? body.quote.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
        confidence: (body.confidence as ObservationConfidence) ?? "LIKELY",
      },
      include: {
        source: { select: sourceSelect },
        claimLinks: true,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to create observation");
  }
});

observationsRouter.put("/:id", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const data: Prisma.ObservationUpdateInput = {};

    if (typeof body.observationText === "string") {
      const text = body.observationText.trim();
      if (!text) return sendError(res, 400, "observationText cannot be empty");
      data.observationText = text;
    }
    if (body.pageOrFolio !== undefined) {
      data.pageOrFolio =
        typeof body.pageOrFolio === "string" ? body.pageOrFolio.trim() || null : null;
    }
    if (body.quote !== undefined) {
      data.quote = typeof body.quote === "string" ? body.quote.trim() || null : null;
    }
    if (body.notes !== undefined) {
      data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }
    if (body.confidence !== undefined) {
      data.confidence = body.confidence as ObservationConfidence;
    }

    const item = await prisma.observation.update({
      where: { observationId: req.params.id },
      data,
      include: {
        source: { select: sourceSelect },
        claimLinks: { include: { claim: { select: claimSelect } } },
      },
    });
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to update observation");
  }
});

observationsRouter.delete("/:id", async (req, res) => {
  try {
    const links = await prisma.observationClaimLink.count({
      where: { observationId: req.params.id },
    });
    if (links > 0) {
      return sendError(
        res,
        403,
        "Cannot delete an observation linked to claims. Remove claim links first.",
      );
    }
    await prisma.observation.delete({ where: { observationId: req.params.id } });
    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete observation");
  }
});

observationsRouter.post("/:id/claim-links", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const claimId = typeof body.claimId === "string" ? body.claimId.trim() : "";
    if (!claimId) return sendError(res, 400, "claimId is required");

    const [observation, claim] = await Promise.all([
      prisma.observation.findUnique({ where: { observationId: req.params.id } }),
      prisma.claim.findUnique({ where: { claimId } }),
    ]);
    if (!observation) return sendError(res, 404, "Observation not found");
    if (!claim) return sendError(res, 400, "Claim not found");

    const relationshipType =
      (body.relationshipType as EvidenceRelationship) ?? "SUPPORTS";

    const item = await prisma.observationClaimLink.create({
      data: {
        observationId: req.params.id,
        claimId,
        relationshipType,
      },
      include: {
        claim: { select: claimSelect },
        observation: {
          include: { source: { select: sourceSelect } },
        },
      },
    });
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return sendError(res, 400, "This observation is already linked to that claim");
    }
    sendError(res, 500, err instanceof Error ? err.message : "Failed to create claim link");
  }
});

observationsRouter.delete("/:id/claim-links/:linkId", async (req, res) => {
  try {
    const link = await prisma.observationClaimLink.findUnique({
      where: { linkId: req.params.linkId },
    });
    if (!link || link.observationId !== req.params.id) {
      return sendError(res, 404, "Link not found");
    }
    await prisma.observationClaimLink.delete({ where: { linkId: req.params.linkId } });
    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete claim link");
  }
});
