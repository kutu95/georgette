import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import type { DocumentKind, Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { analyzeDocumentMatch, findExistingDocuments } from "../documentMatch.js";
import {
  assembleCombinedOcr,
  documentListOrderBy,
  inferDocumentKind,
  parseDocumentMetadata,
} from "../documentUtils.js";
import {
  deleteDocumentFile,
  extensionFromFileName,
  extensionFromMime,
  writeDocumentFile,
} from "../storage.js";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

function sendError(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}

function storedFileName(fileId: string, originalName: string, mimeType: string): string {
  const ext =
    extensionFromFileName(originalName) ||
    extensionFromMime(mimeType) ||
    ".bin";
  return `${fileId}${ext}`;
}

async function refreshCombinedOcrDocument(sourceId: string): Promise<void> {
  const ocrPages = await prisma.file.findMany({
    where: { sourceId, documentKind: "OCR" },
  });
  const { text, pageCount } = await assembleCombinedOcr(ocrPages);
  if (pageCount === 0) {
    const existing = await prisma.file.findFirst({
      where: { sourceId, documentKind: "COMBINED_OCR" },
    });
    if (existing) {
      if (existing.sourceId && existing.filePath) {
        try {
          await deleteDocumentFile(existing.sourceId, path.basename(existing.filePath));
        } catch {
          /* ignore missing file */
        }
      }
      await prisma.file.delete({ where: { fileId: existing.fileId } });
    }
    return;
  }

  let combined = await prisma.file.findFirst({
    where: { sourceId, documentKind: "COMBINED_OCR" },
  });

  if (!combined) {
    combined = await prisma.file.create({
      data: {
        sourceId,
        fileName: "combined-ocr.txt",
        mimeType: "text/plain",
        documentKind: "COMBINED_OCR",
        notes: "Auto-assembled from OCR page documents",
      },
    });
  }

  const storedName = storedFileName(combined.fileId, combined.fileName ?? "combined-ocr.txt", "text/plain");
  const relativePath = await writeDocumentFile(sourceId, storedName, Buffer.from(text, "utf-8"));
  await prisma.file.update({
    where: { fileId: combined.fileId },
    data: {
      filePath: relativePath,
      fileName: "combined-ocr.txt",
      mimeType: "text/plain",
      notes: `Combined from ${pageCount} OCR page${pageCount === 1 ? "" : "s"}`,
    },
  });
}

function buildFileCreateData(
  sourceId: string,
  meta: ReturnType<typeof parseDocumentMetadata>,
  defaults: {
    fileName: string;
    mimeType: string;
    documentKind: DocumentKind;
  },
): Prisma.FileCreateInput {
  return {
    source: { connect: { sourceId } },
    fileName: defaults.fileName,
    mimeType: defaults.mimeType,
    documentKind: meta.documentKind ?? defaults.documentKind,
    pageNumber: meta.pageNumber === undefined ? undefined : meta.pageNumber,
    sortOrder: meta.sortOrder ?? 0,
    groupLabel: meta.groupLabel,
    parent: meta.parentFileId ? { connect: { fileId: meta.parentFileId } } : undefined,
    notes: meta.notes,
    photographer: meta.photographer,
    photoDate: meta.photoDate,
    photoLocation: meta.photoLocation,
    copyrightHolder: meta.copyrightHolder,
  };
}

async function persistUploadedFile(
  sourceId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  meta: ReturnType<typeof parseDocumentMetadata>,
) {
  const documentKind = meta.documentKind ?? inferDocumentKind(mimeType, originalName);
  const file = await prisma.file.create({
    data: buildFileCreateData(sourceId, { ...meta, documentKind }, {
      fileName: originalName,
      mimeType,
      documentKind,
    }),
  });

  const storedName = storedFileName(file.fileId, originalName, mimeType);
  const relativePath = await writeDocumentFile(sourceId, storedName, buffer);
  const updated = await prisma.file.update({
    where: { fileId: file.fileId },
    data: { filePath: relativePath },
  });

  if (documentKind === "OCR") {
    await refreshCombinedOcrDocument(sourceId);
  }

  return updated;
}

async function overwriteExistingFile(
  fileId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  meta: ReturnType<typeof parseDocumentMetadata>,
) {
  const existing = await prisma.file.findUnique({ where: { fileId } });
  if (!existing) throw new Error("Document to overwrite was not found");
  if (existing.documentKind === "COMBINED_OCR") {
    throw new Error("Combined OCR documents cannot be overwritten directly");
  }
  if (!existing.sourceId) throw new Error("Document has no linked source");

  const documentKind = meta.documentKind ?? inferDocumentKind(mimeType, originalName);
  const storedName = storedFileName(fileId, originalName, mimeType);
  const previousStoredName = existing.filePath ? path.basename(existing.filePath) : null;

  if (previousStoredName && previousStoredName !== storedName) {
    try {
      await deleteDocumentFile(existing.sourceId, previousStoredName);
    } catch (err) {
      if (!(err instanceof Error && err.message.includes("ENOENT"))) {
        throw err;
      }
    }
  }

  const relativePath = await writeDocumentFile(existing.sourceId, storedName, buffer);
  const updated = await prisma.file.update({
    where: { fileId },
    data: {
      fileName: originalName,
      mimeType,
      filePath: relativePath,
      documentKind,
      pageNumber: meta.pageNumber === undefined ? existing.pageNumber : meta.pageNumber,
      sortOrder: meta.sortOrder ?? existing.sortOrder,
      groupLabel: meta.groupLabel === undefined ? existing.groupLabel : meta.groupLabel,
      notes: meta.notes === undefined ? existing.notes : meta.notes,
      photographer: meta.photographer === undefined ? existing.photographer : meta.photographer,
      photoDate: meta.photoDate === undefined ? existing.photoDate : meta.photoDate,
      photoLocation:
        meta.photoLocation === undefined ? existing.photoLocation : meta.photoLocation,
      copyrightHolder:
        meta.copyrightHolder === undefined ? existing.copyrightHolder : meta.copyrightHolder,
    },
  });

  if (documentKind === "OCR" || existing.documentKind === "OCR") {
    await refreshCombinedOcrDocument(existing.sourceId);
  }

  return updated;
}

export const documentsRouter = Router();

documentsRouter.post("/smart-upload/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, "No file uploaded");

    const originalName = req.file.originalname || "document";
    const mimeType = req.file.mimetype || "application/octet-stream";
    const result = await analyzeDocumentMatch(req.file.buffer, originalName, mimeType);
    res.json(result);
  } catch (err) {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 400, "File exceeds 100 MB limit");
    }
    sendError(res, 500, err instanceof Error ? err.message : "Analysis failed");
  }
});

documentsRouter.post("/smart-upload/confirm", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return sendError(res, 400, "No file uploaded");

    const sourceId =
      typeof req.body?.sourceId === "string" ? req.body.sourceId.trim() : "";
    if (!sourceId) return sendError(res, 400, "sourceId is required");

    const source = await prisma.source.findUnique({ where: { sourceId } });
    if (!source) return sendError(res, 404, "Source not found");

    const originalName = req.file.originalname || "document";
    const mimeType = req.file.mimetype || "application/octet-stream";
    const meta = parseDocumentMetadata(req.body as Record<string, unknown>);
    const overwriteFileId =
      typeof req.body?.overwriteFileId === "string" ? req.body.overwriteFileId.trim() : "";

    if (overwriteFileId) {
      const target = await prisma.file.findUnique({ where: { fileId: overwriteFileId } });
      if (!target) return sendError(res, 404, "Document to overwrite was not found");
      if (target.sourceId !== sourceId) {
        return sendError(res, 400, "Document to overwrite does not belong to the selected source");
      }

      const updated = await overwriteExistingFile(
        overwriteFileId,
        req.file.buffer,
        originalName,
        mimeType,
        meta,
      );
      return res.json(updated);
    }

    const existingDocuments = await findExistingDocuments(
      req.file.buffer,
      originalName,
      mimeType,
    );
    const duplicatesOnSource = existingDocuments.filter(
      (document) => document.sourceId === sourceId,
    );
    if (duplicatesOnSource.length > 0) {
      return res.status(409).json({
        error: "Document already exists on this source. Choose overwrite or cancel.",
        existingDocuments: duplicatesOnSource,
      });
    }

    const updated = await persistUploadedFile(
      sourceId,
      req.file.buffer,
      originalName,
      mimeType,
      meta,
    );

    res.status(201).json(updated);
  } catch (err) {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 400, "File exceeds 100 MB limit");
    }
    sendError(res, 500, err instanceof Error ? err.message : "Upload failed");
  }
});

documentsRouter.get("/:fileId", async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { fileId: req.params.fileId } });
    if (!file) return sendError(res, 404, "Document not found");
    res.json(file);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to fetch document");
  }
});

documentsRouter.get("/:fileId/content", async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { fileId: req.params.fileId } });
    if (!file?.sourceId || !file.filePath) {
      return sendError(res, 404, "Document not found");
    }

    const storedName = path.basename(file.filePath);
    const { readDocumentFile } = await import("../storage.js");
    const data = await readDocumentFile(file.sourceId, storedName);
    const mimeType = file.mimeType ?? "application/octet-stream";
    const download = req.query.download === "1" || req.query.download === "true";
    const fileName = file.fileName ?? storedName;

    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${fileName.replace(/"/g, "")}"`,
    );
    res.send(data);
  } catch (err) {
    if (err instanceof Error && err.message.includes("ENOENT")) {
      return sendError(res, 404, "File not found on disk");
    }
    sendError(res, 500, err instanceof Error ? err.message : "Failed to read document");
  }
});

documentsRouter.put("/:fileId", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const meta = parseDocumentMetadata(body);
    const data: Prisma.FileUpdateInput = {};

    if (meta.notes !== undefined) data.notes = meta.notes;
    if (typeof body.fileName === "string") {
      const name = body.fileName.trim();
      if (!name) return sendError(res, 400, "fileName cannot be empty");
      data.fileName = name;
    }
    if (meta.documentKind) data.documentKind = meta.documentKind;
    if (meta.pageNumber !== undefined) data.pageNumber = meta.pageNumber;
    if (meta.sortOrder !== undefined) data.sortOrder = meta.sortOrder;
    if (meta.groupLabel !== undefined) data.groupLabel = meta.groupLabel;
    if (meta.parentFileId !== undefined) {
      data.parent = meta.parentFileId
        ? { connect: { fileId: meta.parentFileId } }
        : { disconnect: true };
    }
    if (meta.photographer !== undefined) data.photographer = meta.photographer;
    if (meta.photoDate !== undefined) data.photoDate = meta.photoDate;
    if (meta.photoLocation !== undefined) data.photoLocation = meta.photoLocation;
    if (meta.copyrightHolder !== undefined) data.copyrightHolder = meta.copyrightHolder;

    const file = await prisma.file.update({
      where: { fileId: req.params.fileId },
      data,
    });

    if (file.sourceId && (file.documentKind === "OCR" || meta.documentKind === "OCR")) {
      await refreshCombinedOcrDocument(file.sourceId);
    }

    res.json(file);
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to update document");
  }
});

documentsRouter.delete("/:fileId", async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { fileId: req.params.fileId } });
    if (!file) return sendError(res, 404, "Document not found");
    if (file.documentKind === "COMBINED_OCR") {
      return sendError(res, 403, "Combined OCR is auto-maintained. Edit or remove OCR page documents instead.");
    }

    const sourceId = file.sourceId;

    if (file.sourceId && file.filePath) {
      try {
        await deleteDocumentFile(file.sourceId, path.basename(file.filePath));
      } catch (err) {
        if (!(err instanceof Error && err.message.includes("ENOENT"))) {
          throw err;
        }
      }
    }

    await prisma.file.delete({ where: { fileId: req.params.fileId } });

    if (sourceId && file.documentKind === "OCR") {
      await refreshCombinedOcrDocument(sourceId);
    }

    res.status(204).send();
  } catch (err) {
    sendError(res, 500, err instanceof Error ? err.message : "Failed to delete document");
  }
});

export function registerSourceDocumentRoutes(sourcesRouter: Router): void {
  sourcesRouter.get("/:id/documents/combined-ocr", async (req, res) => {
    try {
      const source = await prisma.source.findUnique({ where: { sourceId: req.params.id } });
      if (!source) return sendError(res, 404, "Source not found");

      const ocrPages = await prisma.file.findMany({
        where: { sourceId: req.params.id, documentKind: "OCR" },
      });
      const combined = await assembleCombinedOcr(ocrPages);
      res.json({ sourceId: req.params.id, ...combined });
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : "Failed to assemble OCR");
    }
  });

  sourcesRouter.get("/:id/documents", async (req, res) => {
    try {
      const source = await prisma.source.findUnique({ where: { sourceId: req.params.id } });
      if (!source) return sendError(res, 404, "Source not found");

      const items = await prisma.file.findMany({
        where: { sourceId: req.params.id },
        orderBy: documentListOrderBy(),
      });
      res.json(items);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : "Failed to list documents");
    }
  });

  sourcesRouter.post("/:id/documents/batch", upload.array("files", 50), async (req, res) => {
    try {
      const source = await prisma.source.findUnique({ where: { sourceId: req.params.id } });
      if (!source) return sendError(res, 404, "Source not found");

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files?.length) return sendError(res, 400, "No files uploaded");

      const meta = parseDocumentMetadata(req.body as Record<string, unknown>);
      const startPage = meta.pageNumber ?? 1;
      const kind = meta.documentKind ?? "IMAGE";
      const created = [];

      for (let i = 0; i < files.length; i++) {
        const uploadFile = files[i];
        const originalName = uploadFile.originalname || `page-${startPage + i}`;
        const mimeType = uploadFile.mimetype || "application/octet-stream";
        const pageNumber = startPage + i;

        const file = await prisma.file.create({
          data: buildFileCreateData(req.params.id, { ...meta, pageNumber, documentKind: kind }, {
            fileName: originalName,
            mimeType,
            documentKind: kind,
          }),
        });

        const storedName = storedFileName(file.fileId, originalName, mimeType);
        const relativePath = await writeDocumentFile(req.params.id, storedName, uploadFile.buffer);
        const updated = await prisma.file.update({
          where: { fileId: file.fileId },
          data: { filePath: relativePath },
        });
        created.push(updated);
      }

      if (kind === "OCR") {
        await refreshCombinedOcrDocument(req.params.id);
      }

      res.status(201).json({ items: created });
    } catch (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return sendError(res, 400, "A file exceeds 100 MB limit");
      }
      sendError(res, 500, err instanceof Error ? err.message : "Batch upload failed");
    }
  });

  sourcesRouter.post("/:id/documents", upload.single("file"), async (req, res) => {
    try {
      const source = await prisma.source.findUnique({ where: { sourceId: req.params.id } });
      if (!source) return sendError(res, 404, "Source not found");

      const meta = parseDocumentMetadata(req.body as Record<string, unknown>);

      if (req.file) {
        const originalName = req.file.originalname || "document";
        const mimeType = req.file.mimetype || "application/octet-stream";
        const updated = await persistUploadedFile(
          req.params.id,
          req.file.buffer,
          originalName,
          mimeType,
          meta,
        );
        return res.status(201).json(updated);
      }

      const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
      if (!text) {
        return sendError(res, 400, "Upload a file or provide text content");
      }

      const fileName =
        (typeof req.body?.fileName === "string" && req.body.fileName.trim()) ||
        "notes.txt";
      const documentKind = meta.documentKind ?? "TEXT";

      const file = await prisma.file.create({
        data: buildFileCreateData(req.params.id, { ...meta, documentKind }, {
          fileName: fileName.endsWith(".txt") ? fileName : `${fileName}.txt`,
          mimeType: "text/plain",
          documentKind,
        }),
      });

      const storedName = storedFileName(file.fileId, file.fileName!, "text/plain");
      const relativePath = await writeDocumentFile(
        req.params.id,
        storedName,
        Buffer.from(text, "utf-8"),
      );
      const updated = await prisma.file.update({
        where: { fileId: file.fileId },
        data: { filePath: relativePath },
      });

      if (documentKind === "OCR") {
        await refreshCombinedOcrDocument(req.params.id);
      }

      res.status(201).json(updated);
    } catch (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return sendError(res, 400, "File exceeds 100 MB limit");
      }
      sendError(res, 500, err instanceof Error ? err.message : "Failed to upload document");
    }
  });
}
