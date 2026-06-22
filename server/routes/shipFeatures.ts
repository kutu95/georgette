import { Router, type Request, type Response } from "express";
import type {
  Prisma,
  ShipFeatureCategory,
  ShipFeatureConfidence,
  ShipFeatureRelationship,
  ShipFeatureStatus,
  VisualImpact,
} from "@prisma/client";
import { prisma } from "../db.js";

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

const observationInclude = {
  source: {
    select: {
      sourceId: true,
      currentFileName: true,
      suggestedStandardFileName: true,
      category: true,
      importance: true,
      documentType: true,
      originalOrDerived: true,
    },
  },
} as const;

function buildWhere(query: Request["query"]): Prisma.ShipFeatureWhereInput {
  const and: Prisma.ShipFeatureWhereInput[] = [];
  const q = typeof query.q === "string" ? query.q.trim() : "";

  if (q) {
    and.push({
      OR: [
        { featureId: { contains: q, mode: "insensitive" } },
        { featureName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        {
          observationLinks: {
            some: {
              observation: {
                OR: [
                  { observationText: { contains: q, mode: "insensitive" } },
                  { source: { sourceId: { contains: q, mode: "insensitive" } } },
                  { source: { currentFileName: { contains: q, mode: "insensitive" } } },
                  {
                    source: {
                      suggestedStandardFileName: { contains: q, mode: "insensitive" },
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    });
  }

  const category = typeof query.category === "string" ? query.category.trim() : "";
  if (category) and.push({ category: category as ShipFeatureCategory });

  const status = typeof query.status === "string" ? query.status.trim() : "";
  if (status) and.push({ status: status as ShipFeatureStatus });

  const confidence = typeof query.confidence === "string" ? query.confidence.trim() : "";
  if (confidence) and.push({ confidence: confidence as ShipFeatureConfidence });

  const visualImpact =
    typeof query.visualImpact === "string" ? query.visualImpact.trim() : "";
  if (visualImpact) and.push({ visualImpact: visualImpact as VisualImpact });

  const withoutEvidence =
    query.withoutEvidence === "1" || query.withoutEvidence === "true";
  if (withoutEvidence) {
    and.push({ observationLinks: { none: {} } });
  }

  const excludeFeatureId =
    typeof query.excludeFeatureId === "string" ? query.excludeFeatureId.trim() : "";
  if (excludeFeatureId) {
    and.push({ featureId: { not: excludeFeatureId } });
  }

  return and.length > 0 ? { AND: and } : {};
}

export const shipFeaturesRouter = Router();

shipFeaturesRouter.get("/", async (req, res) => {
  try {
    const where = buildWhere(req.query);
    const [total, filtered, items] = await Promise.all([
      prisma.shipFeature.count(),
      prisma.shipFeature.count({ where }),
      prisma.shipFeature.findMany({
        where,
        orderBy: [{ category: "asc" }, { featureId: "asc" }],
        include: {
          observationLinks: {
            include: { observation: { include: observationInclude } },
          },
        },
      }),
    ]);
    res.json({ items, total, filtered });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to list ship features");
  }
});

shipFeaturesRouter.get("/:id/observations", async (req, res) => {
  try {
    const items = await prisma.observationShipFeatureLink.findMany({
      where: { featureId: req.params.id },
      include: { observation: { include: observationInclude } },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to load observations");
  }
});

shipFeaturesRouter.get("/:id", async (req, res) => {
  try {
    const item = await prisma.shipFeature.findUnique({
      where: { featureId: req.params.id },
      include: {
        observationLinks: {
          include: { observation: { include: observationInclude } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!item) return sendError(res, 404, "Ship feature not found");
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch ship feature");
  }
});

shipFeaturesRouter.post("/", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const featureId = typeof body.featureId === "string" ? body.featureId.trim() : "";
    const featureName = typeof body.featureName === "string" ? body.featureName.trim() : "";
    const category = body.category as ShipFeatureCategory;

    if (!featureId) return sendError(res, 400, "featureId is required");
    if (!featureName) return sendError(res, 400, "featureName is required");
    if (!category) return sendError(res, 400, "category is required");

    const item = await prisma.shipFeature.create({
      data: {
        featureId,
        featureName,
        category,
        description:
          typeof body.description === "string" ? body.description.trim() || null : null,
        status: (body.status as ShipFeatureStatus) ?? "POSSIBLE",
        confidence: (body.confidence as ShipFeatureConfidence) ?? "MEDIUM",
        visualImpact: (body.visualImpact as VisualImpact) ?? "MINOR",
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to create ship feature");
  }
});

shipFeaturesRouter.put("/:id", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const data: Prisma.ShipFeatureUpdateInput = {};

    if (typeof body.featureName === "string") {
      const name = body.featureName.trim();
      if (!name) return sendError(res, 400, "featureName cannot be empty");
      data.featureName = name;
    }
    if (body.category !== undefined) data.category = body.category as ShipFeatureCategory;
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string" ? body.description.trim() || null : null;
    }
    if (body.status !== undefined) data.status = body.status as ShipFeatureStatus;
    if (body.confidence !== undefined) data.confidence = body.confidence as ShipFeatureConfidence;
    if (body.visualImpact !== undefined) data.visualImpact = body.visualImpact as VisualImpact;
    if (body.notes !== undefined) {
      data.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }

    const item = await prisma.shipFeature.update({
      where: { featureId: req.params.id },
      data,
      include: {
        observationLinks: {
          include: { observation: { include: observationInclude } },
        },
      },
    });
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to update ship feature");
  }
});

shipFeaturesRouter.delete("/:id", async (req, res) => {
  try {
    const links = await prisma.observationShipFeatureLink.count({
      where: { featureId: req.params.id },
    });
    if (links > 0) {
      return sendError(
        res,
        403,
        "Cannot delete a ship feature with linked observations. Remove links first.",
      );
    }
    await prisma.shipFeature.delete({ where: { featureId: req.params.id } });
    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete ship feature");
  }
});

shipFeaturesRouter.post("/:id/observation-links", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const observationId =
      typeof body.observationId === "string" ? body.observationId.trim() : "";
    if (!observationId) return sendError(res, 400, "observationId is required");

    const [feature, observation] = await Promise.all([
      prisma.shipFeature.findUnique({ where: { featureId: req.params.id } }),
      prisma.observation.findUnique({ where: { observationId } }),
    ]);
    if (!feature) return sendError(res, 404, "Ship feature not found");
    if (!observation) return sendError(res, 400, "Observation not found");

    const item = await prisma.observationShipFeatureLink.create({
      data: {
        featureId: req.params.id,
        observationId,
        relationshipType: (body.relationshipType as ShipFeatureRelationship) ?? "SUPPORTS",
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      },
      include: {
        observation: { include: observationInclude },
      },
    });
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return sendError(res, 400, "This observation is already linked to that feature");
    }
    sendError(res, 500, err instanceof Error ? err.message : "Failed to create link");
  }
});

shipFeaturesRouter.delete("/:id/observation-links/:linkId", async (req, res) => {
  try {
    const link = await prisma.observationShipFeatureLink.findUnique({
      where: { linkId: req.params.linkId },
    });
    if (!link || link.featureId !== req.params.id) {
      return sendError(res, 404, "Link not found");
    }
    await prisma.observationShipFeatureLink.delete({ where: { linkId: req.params.linkId } });
    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete link");
  }
});
