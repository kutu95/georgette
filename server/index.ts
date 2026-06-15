import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import Papa from "papaparse";
import { prisma } from "./db.js";
import { createCrudRouter, claimBeforeWrite } from "./routes/crud.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", schema: "georgette" });
});

app.use(
  "/api/sources",
  createCrudRouter({
    model: "source",
    idField: "sourceId",
    beforeCreate: (body) => {
      if (!body.sourceId || typeof body.sourceId !== "string") {
        return "sourceId is required";
      }
      return body;
    },
  }),
);

app.use(
  "/api/claims",
  createCrudRouter({
    model: "claim",
    idField: "claimId",
    beforeCreate: (body) => claimBeforeWrite(undefined, body),
    beforeUpdate: (id, body) => claimBeforeWrite(id, body),
  }),
);

// Evidence links cannot be deleted if they contradict (historical rule: keep contradictory evidence)
app.use(
  "/api/evidence-links",
  createCrudRouter({
    model: "evidenceLink",
    idField: "evidenceId",
    canDelete: async (id) => {
      const link = await prisma.evidenceLink.findUnique({ where: { evidenceId: id } });
      if (link?.relationship === "CONTRADICTS") {
        return "Contradictory evidence must not be deleted per historical rules.";
      }
      return null;
    },
  }),
);

app.use("/api/people", createCrudRouter({ model: "person", idField: "personId" }));
app.use("/api/places", createCrudRouter({ model: "place", idField: "placeId" }));
app.use("/api/events", createCrudRouter({ model: "event", idField: "eventId" }));
app.use(
  "/api/contradictions",
  createCrudRouter({
    model: "contradiction",
    idField: "contradictionId",
    canDelete: async () =>
      "Contradiction records must not be deleted per historical rules.",
  }),
);
app.use(
  "/api/manuscript-references",
  createCrudRouter({ model: "manuscriptReference", idField: "manuscriptRefId" }),
);
app.use("/api/tags", createCrudRouter({ model: "tag", idField: "tagId" }));
app.use(
  "/api/relationships",
  createCrudRouter({ model: "relationship", idField: "relationshipId" }),
);

// CSV import for sources
app.post("/api/import/sources", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const text = req.file.buffer.toString("utf-8");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    res.status(400).json({ error: "CSV parse error", details: parsed.errors });
    return;
  }

  const expectedColumns = [
    "source_id",
    "current_file_name",
    "suggested_standard_file_name",
    "document_type",
    "category",
    "original_or_derived",
    "importance",
    "notes",
  ];

  const headers = parsed.meta.fields ?? [];
  const missing = expectedColumns.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    res.status(400).json({
      error: `Missing required columns: ${missing.join(", ")}`,
      expected: expectedColumns,
    });
    return;
  }

  let created = 0;
  let updated = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const sourceId = row.source_id?.trim();
    if (!sourceId) {
      errors.push({ row: i + 2, error: "source_id is required" });
      continue;
    }

    const data = {
      currentFileName: row.current_file_name?.trim() || null,
      suggestedStandardFileName: row.suggested_standard_file_name?.trim() || null,
      documentType: row.document_type?.trim() || null,
      category: row.category?.trim() || null,
      originalOrDerived: row.original_or_derived?.trim() || null,
      importance: row.importance?.trim() || null,
      notes: row.notes?.trim() || null,
    };

    try {
      const existing = await prisma.source.findUnique({ where: { sourceId } });
      if (existing) {
        await prisma.source.update({ where: { sourceId }, data });
        updated++;
      } else {
        await prisma.source.create({ data: { sourceId, ...data } });
        created++;
      }
    } catch (err) {
      errors.push({
        row: i + 2,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  res.json({ created, updated, errors, total: parsed.data.length });
});

// Entity lookup for relationships UI
app.get("/api/entities/:type", async (req, res) => {
  const type = req.params.type.toUpperCase();
  try {
    let items: { id: string; label: string }[] = [];
    switch (type) {
      case "SOURCE":
        items = (await prisma.source.findMany()).map((s) => ({
          id: s.sourceId,
          label: s.currentFileName ?? s.sourceId,
        }));
        break;
      case "CLAIM":
        items = (await prisma.claim.findMany()).map((c) => ({
          id: c.claimId,
          label: c.claimText.slice(0, 80),
        }));
        break;
      case "PERSON":
        items = (await prisma.person.findMany()).map((p) => ({
          id: p.personId,
          label: p.name,
        }));
        break;
      case "PLACE":
        items = (await prisma.place.findMany()).map((p) => ({
          id: p.placeId,
          label: p.name,
        }));
        break;
      case "EVENT":
        items = (await prisma.event.findMany()).map((e) => ({
          id: e.eventId,
          label: e.title,
        }));
        break;
      case "CONTRADICTION":
        items = (await prisma.contradiction.findMany()).map((c) => ({
          id: c.contradictionId,
          label: c.description ?? c.contradictionId,
        }));
        break;
      case "MANUSCRIPT_REFERENCE":
        items = (await prisma.manuscriptReference.findMany()).map((m) => ({
          id: m.manuscriptRefId,
          label: m.referenceText ?? m.manuscriptRefId,
        }));
        break;
      case "TAG":
        items = (await prisma.tag.findMany()).map((t) => ({
          id: t.tagId,
          label: t.name,
        }));
        break;
      case "EVIDENCE_LINK":
        items = (await prisma.evidenceLink.findMany()).map((e) => ({
          id: e.evidenceId,
          label: `${e.relationship} — ${e.evidenceId}`,
        }));
        break;
      case "FILE":
        items = (await prisma.file.findMany()).map((f) => ({
          id: f.fileId,
          label: f.fileName ?? f.fileId,
        }));
        break;
      default:
        res.status(400).json({ error: "Unknown entity type" });
        return;
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Lookup failed" });
  }
});

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`Georgette Research API running on http://localhost:${PORT}`);
});
