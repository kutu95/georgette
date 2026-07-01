import { Router, type Request, type Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { pickPrimaryDocument } from "../documentView.js";
import { nextSourceIdFromExisting, normalizeSourceIdInput } from "../sourceId.js";

const SORT_FIELDS = {
  source_id: "sourceId",
  suggested_standard_file_name: "suggestedStandardFileName",
  category: "category",
  importance: "importance",
} as const;

type SortKey = keyof typeof SORT_FIELDS;

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

function buildWhere(query: Request["query"]): Prisma.SourceWhereInput {
  const and: Prisma.SourceWhereInput[] = [];
  const q = typeof query.q === "string" ? query.q.trim() : "";

  if (q) {
    and.push({
      OR: [
        { sourceId: { contains: q, mode: "insensitive" } },
        { currentFileName: { contains: q, mode: "insensitive" } },
        { suggestedStandardFileName: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { importance: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const category = typeof query.category === "string" ? query.category.trim() : "";
  if (category) {
    and.push({ category: { equals: category, mode: "insensitive" } });
  }

  const importance = typeof query.importance === "string" ? query.importance.trim() : "";
  if (importance) {
    and.push({ importance: { equals: importance, mode: "insensitive" } });
  }

  const originalOrDerived =
    typeof query.original_or_derived === "string"
      ? query.original_or_derived.trim()
      : typeof query.originalOrDerived === "string"
        ? query.originalOrDerived.trim()
        : "";
  if (originalOrDerived) {
    and.push({ originalOrDerived: { equals: originalOrDerived, mode: "insensitive" } });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildOrderBy(query: Request["query"]): Prisma.SourceOrderByWithRelationInput {
  const sortBy = typeof query.sortBy === "string" ? query.sortBy : "source_id";
  const field = SORT_FIELDS[sortBy as SortKey] ?? "sourceId";
  const sortDir = query.sortDir === "desc" ? "desc" : "asc";
  return { [field]: sortDir };
}

async function distinctValues(field: "category" | "importance" | "originalOrDerived") {
  const rows = await prisma.source.findMany({
    where: { [field]: { not: null } },
    distinct: [field],
    select: { [field]: true },
    orderBy: { [field]: "asc" },
  });
  return rows
    .map((row) => row[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0);
}

export const sourcesRouter = Router();

sourcesRouter.get("/meta/filters", async (_req, res) => {
  try {
    const [categories, importances, originalOrDerived] = await Promise.all([
      distinctValues("category"),
      distinctValues("importance"),
      distinctValues("originalOrDerived"),
    ]);
    res.json({ categories, importances, originalOrDerived });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to load filter options");
  }
});

sourcesRouter.get("/meta/next-id", async (_req, res) => {
  try {
    const rows = await prisma.source.findMany({ select: { sourceId: true } });
    const nextSourceId = nextSourceIdFromExisting(rows.map((row) => row.sourceId));
    res.json({ nextSourceId });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to suggest next source ID");
  }
});

sourcesRouter.get("/search", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1),
      50,
    );
    const items = await prisma.source.findMany({
      where: buildWhere({ q }),
      take: limit,
      orderBy: { sourceId: "asc" },
      select: {
        sourceId: true,
        currentFileName: true,
        suggestedStandardFileName: true,
        documentType: true,
        category: true,
        importance: true,
        originalOrDerived: true,
        notes: true,
      },
    });
    res.json({ items });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Source search failed");
  }
});

sourcesRouter.get("/:id/observations", async (req, res) => {
  try {
    const items = await prisma.observation.findMany({
      where: { sourceId: req.params.id },
      include: {
        claimLinks: {
          include: {
            claim: {
              select: { claimId: true, claimText: true, status: true, confidence: true },
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

sourcesRouter.get("/:id/referenced-by", async (req, res) => {
  try {
    const items = await prisma.evidenceLink.findMany({
      where: { sourceId: req.params.id },
      include: {
        claim: {
          select: { claimId: true, claimText: true, status: true, confidence: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to load references");
  }
});

sourcesRouter.get("/", async (req, res) => {
  try {
    const where = buildWhere(req.query);
    const orderBy = buildOrderBy(req.query);

    const [total, rows] = await Promise.all([
      prisma.source.count(),
      prisma.source.findMany({
        where,
        orderBy,
        include: {
          files: {
            where: { filePath: { not: null } },
            select: {
              fileId: true,
              fileName: true,
              mimeType: true,
              documentKind: true,
              pageNumber: true,
              createdAt: true,
              filePath: true,
            },
          },
        },
      }),
    ]);

    const items = rows.map(({ files, ...source }) => {
      const viewableFiles = files.filter((file) => file.documentKind !== "COMBINED_OCR");
      return {
        ...source,
        documentCount: viewableFiles.length,
        primaryDocument: pickPrimaryDocument(files),
      };
    });

    res.json({
      items,
      total,
      filtered: items.length,
    });
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to search sources");
  }
});

sourcesRouter.get("/:id", async (req, res) => {
  try {
    const item = await prisma.source.findUnique({
      where: { sourceId: req.params.id },
      include: {
        parent: { select: { sourceId: true, currentFileName: true } },
        children: { select: { sourceId: true, currentFileName: true } },
      },
    });
    if (!item) return sendError(res, 404, "Source not found");
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch source");
  }
});

sourcesRouter.post("/", async (req, res) => {
  try {
    const rawId = req.body?.sourceId;
    if (!rawId || typeof rawId !== "string" || !rawId.trim()) {
      return sendError(res, 400, "sourceId is required");
    }
    const sourceId = normalizeSourceIdInput(rawId);
    const { sourceId: _ignored, ...rest } = req.body;
    const item = await prisma.source.create({ data: { sourceId, ...rest } });
    res.status(201).json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to create source");
  }
});

sourcesRouter.put("/:id", async (req, res) => {
  try {
    const item = await prisma.source.update({
      where: { sourceId: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to update source");
  }
});

sourcesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.source.delete({ where: { sourceId: req.params.id } });
    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete source");
  }
});
