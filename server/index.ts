import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import multer from "multer";
import Papa from "papaparse";
import { checkDatabase, prisma, withDbRetry } from "./db.js";
import { attachErrorHandlers, installProcessHandlers } from "./middleware.js";
import { buildStats } from "./stats.js";
import { createCrudRouter } from "./routes/crud.js";
import { sourcesRouter } from "./routes/sources.js";
import { claimsRouter } from "./routes/claims.js";
import { evidenceRouter } from "./routes/evidence.js";
import { observationsRouter } from "./routes/observations.js";
import { shipFeaturesRouter } from "./routes/shipFeatures.js";
import { documentsRouter, registerSourceDocumentRoutes } from "./routes/documents.js";
import { authRouter } from "./routes/auth.js";
import { authMiddleware, isAuthEnabled } from "./auth.js";
import { seedTier1Claims } from "./seedTier1Claims.js";
import { seedShipFeatures } from "./seedShipFeatures.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

installProcessHandlers();

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const db = await checkDatabase();
  if (db.ok) {
    res.json({ status: "ok", schema: "georgette", database: "connected" });
    return;
  }
  res.status(503).json({
    status: "degraded",
    schema: "georgette",
    database: "unreachable",
    error: db.error,
  });
});

app.use("/api/auth", authRouter);
app.use(authMiddleware);

registerSourceDocumentRoutes(sourcesRouter);
app.use("/api/sources", sourcesRouter);

app.use("/api/documents", documentsRouter);

app.get("/api/stats", async (_req, res) => {
  try {
    const stats = await buildStats();
    res.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load stats";
    console.error("[api] /api/stats failed:", message);
    res.status(200).json({
      sources: 0,
      claims: 0,
      evidenceLinks: 0,
      observations: 0,
      people: 0,
      places: 0,
      events: 0,
      contradictions: 0,
      topCategories: [],
      tier1: { total: 0, supported: 0, underInvestigation: 0, unresolved: 0 },
      observationsQuality: { total: 0, withoutClaims: 0, claimsWithoutObservations: 0 },
      shipReconstruction: {
        total: 0,
        confirmed: 0,
        probable: 0,
        possible: 0,
        rejected: 0,
        criticalVisual: 0,
        criticalWithoutEvidence: 0,
      },
      warnings: [message],
    });
  }
});

app.use("/api/claims", claimsRouter);

app.use("/api/observations", observationsRouter);

app.use("/api/ship-features", shipFeaturesRouter);

app.use("/api/evidence-links", evidenceRouter);

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
      case "OBSERVATION":
        items = (await prisma.observation.findMany()).map((o) => ({
          id: o.observationId,
          label: o.observationText.slice(0, 80),
        }));
        break;
      case "SHIP_FEATURE":
        items = (await prisma.shipFeature.findMany()).map((f) => ({
          id: f.featureId,
          label: f.featureName,
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

function attachProductionFrontend(app: Express): void {
  const distPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(distPath));
  app.get(/^(?!\/api\/).*/, (_req, res, next) => {
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

if (process.env.NODE_ENV === "production") {
  attachProductionFrontend(app);
}

attachErrorHandlers(app);

const PORT = Number(process.env.PORT) || 3001;

async function start() {
  const db = await checkDatabase();
  if (db.ok) {
    console.log("Database connected");
    try {
      await withDbRetry(() => seedTier1Claims());
      await withDbRetry(() => seedShipFeatures());
    } catch (err) {
      console.warn(
        "[api] Seed skipped:",
        err instanceof Error ? err.message : String(err),
      );
    }
  } else {
    console.warn("Database not ready — API will start in degraded mode:");
    console.warn(`  ${db.error}`);
    console.warn(
      "  If the home server is offline, run: npm run db:local:up && npm run db:local:migrate",
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    const mode = process.env.NODE_ENV === "production" ? "production" : "development";
    console.log(`Georgette Research API running on http://0.0.0.0:${PORT} (${mode})`);
    if (mode === "production" && !isAuthEnabled()) {
      console.warn(
        "[auth] ADMIN_PASSWORD is not set — the app is open without a password on all networks.",
      );
    } else if (isAuthEnabled()) {
      console.log("[auth] Password required for access from outside the LAN");
    }
  });
}

void start();
