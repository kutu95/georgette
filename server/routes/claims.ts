import { Router, type Request, type Response } from "express";
import type { ClaimStatus, ClaimTier, ConfidenceLevel, Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { claimBeforeWrite } from "./crud.js";

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

function parseLimit(query: Request["query"]): number {
  const raw = typeof query.limit === "string" ? parseInt(query.limit, 10) : 20;
  return Math.min(Math.max(Number.isFinite(raw) ? raw : 20, 1), 50);
}

function buildSearchWhere(q: string): Prisma.ClaimWhereInput {
  if (!q) return {};
  return {
    OR: [
      { claimId: { contains: q, mode: "insensitive" } },
      { claimText: { contains: q, mode: "insensitive" } },
      { topic: { contains: q, mode: "insensitive" } },
    ],
  };
}

export const claimsRouter = Router();

claimsRouter.get("/search", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = parseLimit(req.query);
    const items = await prisma.claim.findMany({
      where: buildSearchWhere(q),
      take: limit,
      orderBy: { claimId: "asc" },
      select: {
        claimId: true,
        claimText: true,
        topic: true,
        claimTier: true,
        status: true,
        confidence: true,
      },
    });
    res.json({ items });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Claim search failed");
  }
});

claimsRouter.get("/:id/observations", async (req, res) => {
  try {
    const items = await prisma.observationClaimLink.findMany({
      where: { claimId: req.params.id },
      include: {
        observation: {
          include: {
            source: {
              select: {
                sourceId: true,
                suggestedStandardFileName: true,
                currentFileName: true,
                category: true,
                importance: true,
                documentType: true,
                originalOrDerived: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to load observations");
  }
});

claimsRouter.get("/:id/evidence", async (req, res) => {
  try {
    const items = await prisma.evidenceLink.findMany({
      where: { claimId: req.params.id },
      include: {
        source: {
          select: {
            sourceId: true,
            suggestedStandardFileName: true,
            currentFileName: true,
            category: true,
            importance: true,
            documentType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to load evidence");
  }
});

claimsRouter.get("/:id", async (req, res) => {
  try {
    const item = await prisma.claim.findUnique({ where: { claimId: req.params.id } });
    if (!item) return sendError(res, 404, "Claim not found");
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch claim");
  }
});

claimsRouter.get("/", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const topic = typeof req.query.topic === "string" ? req.query.topic.trim() : "";
    const tier = typeof req.query.tier === "string" ? req.query.tier.trim() : "";
    const confidence =
      typeof req.query.confidence === "string" ? req.query.confidence.trim() : "";

    const and: Prisma.ClaimWhereInput[] = [];
    if (q) {
      and.push({
        OR: [
          { claimId: { contains: q, mode: "insensitive" } },
          { claimText: { contains: q, mode: "insensitive" } },
          { topic: { contains: q, mode: "insensitive" } },
        ],
      });
    }
    if (status) and.push({ status: status as ClaimStatus });
    if (topic) and.push({ topic: { equals: topic, mode: "insensitive" } });
    if (tier) and.push({ claimTier: tier as ClaimTier });
    if (confidence) and.push({ confidence: confidence as ConfidenceLevel });

    const where = and.length > 0 ? { AND: and } : {};

    const [total, filtered, items] = await Promise.all([
      prisma.claim.count(),
      prisma.claim.count({ where }),
      prisma.claim.findMany({
        where,
        orderBy: [{ claimTier: "asc" }, { claimId: "asc" }],
      }),
    ]);

    res.json({ items, total, filtered });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to list claims");
  }
});

claimsRouter.post("/", async (req, res) => {
  try {
    let data = req.body as Record<string, unknown>;
    const result = await claimBeforeWrite(undefined, data);
    if (typeof result === "string") return sendError(res, 400, result);
    data = result;
    const item = await prisma.claim.create({ data });
    res.status(201).json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to create claim");
  }
});

claimsRouter.put("/:id", async (req, res) => {
  try {
    let data = req.body as Record<string, unknown>;
    const result = await claimBeforeWrite(req.params.id, data);
    if (typeof result === "string") return sendError(res, 400, result);
    data = result;
    const item = await prisma.claim.update({
      where: { claimId: req.params.id },
      data,
    });
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to update claim");
  }
});

claimsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.claim.delete({ where: { claimId: req.params.id } });
    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete claim");
  }
});
