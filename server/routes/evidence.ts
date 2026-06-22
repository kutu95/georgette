import { Router, type Request, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

const SORT_FIELDS = {
  claim: "claimId",
  source: "sourceId",
  relationship: "relationship",
} as const;

function buildWhere(query: Request["query"]): Prisma.EvidenceLinkWhereInput {
  const and: Prisma.EvidenceLinkWhereInput[] = [];

  const relationship =
    typeof query.relationship === "string" ? query.relationship.trim() : "";
  if (relationship) {
    and.push({ relationship: relationship as Prisma.EnumEvidenceRelationshipFilter });
  }

  const sourceCategory =
    typeof query.sourceCategory === "string" ? query.sourceCategory.trim() : "";
  if (sourceCategory) {
    and.push({
      source: { category: { equals: sourceCategory, mode: "insensitive" } },
    });
  }

  const sourceImportance =
    typeof query.sourceImportance === "string" ? query.sourceImportance.trim() : "";
  if (sourceImportance) {
    and.push({
      source: { importance: { equals: sourceImportance, mode: "insensitive" } },
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildOrderBy(
  query: Request["query"],
): Prisma.EvidenceLinkOrderByWithRelationInput {
  const sortBy = typeof query.sortBy === "string" ? query.sortBy : "claim";
  const field = SORT_FIELDS[sortBy as keyof typeof SORT_FIELDS] ?? "claimId";
  const sortDir = query.sortDir === "desc" ? "desc" : "asc";
  return { [field]: sortDir };
}

const evidenceInclude = {
  claim: {
    select: { claimId: true, claimText: true, status: true, confidence: true },
  },
  source: {
    select: {
      sourceId: true,
      currentFileName: true,
      suggestedStandardFileName: true,
      category: true,
      importance: true,
      documentType: true,
    },
  },
} as const;

export const evidenceRouter = Router();

evidenceRouter.get("/meta/filters", async (_req, res) => {
  try {
    const [categories, importances] = await Promise.all([
      prisma.source.findMany({
        where: { category: { not: null } },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
      prisma.source.findMany({
        where: { importance: { not: null } },
        distinct: ["importance"],
        select: { importance: true },
        orderBy: { importance: "asc" },
      }),
    ]);
    res.json({
      relationships: ["SUPPORTS", "CONTRADICTS", "QUALIFIES", "MENTIONS"],
      sourceCategories: categories
        .map((r) => r.category)
        .filter((v): v is string => Boolean(v)),
      sourceImportances: importances
        .map((r) => r.importance)
        .filter((v): v is string => Boolean(v)),
    });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to load filters");
  }
});

evidenceRouter.get("/", async (req, res) => {
  try {
    const where = buildWhere(req.query);
    const orderBy = buildOrderBy(req.query);

    const [total, items] = await Promise.all([
      prisma.evidenceLink.count(),
      prisma.evidenceLink.findMany({
        where,
        orderBy,
        include: evidenceInclude,
      }),
    ]);

    res.json({
      items,
      total,
      filtered: items.length,
    });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to list evidence");
  }
});

evidenceRouter.get("/:id", async (req, res) => {
  try {
    const item = await prisma.evidenceLink.findUnique({
      where: { evidenceId: req.params.id },
      include: evidenceInclude,
    });
    if (!item) return sendError(res, 404, "Evidence link not found");
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch evidence");
  }
});

evidenceRouter.post("/", async (req, res) => {
  try {
    const item = await prisma.evidenceLink.create({
      data: req.body,
      include: evidenceInclude,
    });
    res.status(201).json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to create evidence");
  }
});

evidenceRouter.put("/:id", async (req, res) => {
  try {
    const item = await prisma.evidenceLink.update({
      where: { evidenceId: req.params.id },
      data: req.body,
      include: evidenceInclude,
    });
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to update evidence");
  }
});

evidenceRouter.delete("/:id", async (req, res) => {
  try {
    const link = await prisma.evidenceLink.findUnique({
      where: { evidenceId: req.params.id },
    });
    if (link?.relationship === "CONTRADICTS") {
      return sendError(
        res,
        403,
        "Contradictory evidence must not be deleted per historical rules.",
      );
    }
    await prisma.evidenceLink.delete({ where: { evidenceId: req.params.id } });
    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete evidence");
  }
});
