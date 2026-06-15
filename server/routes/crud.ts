import { Router, type Request, type Response } from "express";
import { prisma } from "../db.js";
import { validateHighConfidenceClaim } from "../validation.js";

type CrudConfig = {
  model: keyof typeof prisma;
  idField: string;
  beforeCreate?: (body: Record<string, unknown>) => Promise<Record<string, unknown> | string>;
  beforeUpdate?: (
    id: string,
    body: Record<string, unknown>,
  ) => Promise<Record<string, unknown> | string>;
  canDelete?: (id: string) => Promise<string | null>;
};

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

export function createCrudRouter(config: CrudConfig): Router {
  const router = Router();
  const model = prisma[config.model] as {
    findMany: (args?: object) => Promise<unknown[]>;
    findUnique: (args: object) => Promise<unknown | null>;
    create: (args: object) => Promise<unknown>;
    update: (args: object) => Promise<unknown>;
    delete: (args: object) => Promise<unknown>;
  };

  router.get("/", async (_req, res) => {
    try {
      const items = await model.findMany({ orderBy: { createdAt: "desc" } });
      res.json(items);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : "Failed to list records");
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const item = await model.findUnique({
        where: { [config.idField]: req.params.id },
      });
      if (!item) return sendError(res, 404, "Not found");
      res.json(item);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch record");
    }
  });

  router.post("/", async (req, res) => {
    try {
      let data = req.body as Record<string, unknown>;
      if (config.beforeCreate) {
        const result = await config.beforeCreate(data);
        if (typeof result === "string") return sendError(res, 400, result);
        data = result;
      }
      const item = await model.create({ data });
      res.status(201).json(item);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : "Failed to create record");
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      let data = req.body as Record<string, unknown>;
      if (config.beforeUpdate) {
        const result = await config.beforeUpdate(req.params.id, data);
        if (typeof result === "string") return sendError(res, 400, result);
        data = result;
      }
      const item = await model.update({
        where: { [config.idField]: req.params.id },
        data,
      });
      res.json(item);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : "Failed to update record");
    }
  });

  router.delete("/:id", async (req, res) => {
    if (config.canDelete) {
      const blockReason = await config.canDelete(req.params.id);
      if (blockReason) return sendError(res, 403, blockReason);
    }
    try {
      await model.delete({ where: { [config.idField]: req.params.id } });
      res.status(204).send();
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : "Failed to delete record");
    }
  });

  return router;
}

export async function claimBeforeWrite(
  id: string | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | string> {
  if (body.confidence === "HIGH") {
    const error = await validateHighConfidenceClaim(id, "HIGH");
    if (error) return error;
  }
  return body;
}
