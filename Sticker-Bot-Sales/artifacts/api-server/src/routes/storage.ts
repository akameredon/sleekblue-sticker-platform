import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { requireAuth } from "./auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;
    const allowedTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
      "application/postscript",
    ]);
    if (size > 20 * 1024 * 1024) {
      res.status(413).json({ error: "Artwork files must be 20 MB or smaller." });
      return;
    }
    if (!allowedTypes.has(contentType.toLowerCase())) {
      res.status(415).json({ error: "Supported artwork formats: PNG, JPG, WEBP, SVG, PDF and AI/EPS." });
      return;
    }
    if (name.length > 180 || name.includes("/") || name.includes("\\")) {
      res.status(400).json({ error: "Invalid artwork filename." });
      return;
    }

    const userId = (req as Request & { user: { id: number } }).user.id;
    const uploadURL = await objectStorageService.getObjectEntityUploadURL(userId);
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * POST /storage/uploads/complete
 *
 * Finalize an upload by assigning a private ACL to the authenticated owner's
 * user-scoped upload path. Call only after the browser's PUT upload succeeds.
 */
router.post("/storage/uploads/complete", requireAuth, async (req: Request, res: Response) => {
  const userId = (req as Request & { user: { id: number } }).user.id;
  const objectPath = typeof req.body?.objectPath === "string" ? req.body.objectPath : "";
  const ownerPrefix = `/objects/uploads/${userId}/`;
  if (!objectPath.startsWith(ownerPrefix) || objectPath.includes("..")) {
    res.status(400).json({ error: "Invalid upload path" });
    return;
  }

  try {
    const securedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
      owner: String(userId),
      visibility: "private",
    });
    res.json({ objectPath: securedPath, visibility: "private" });
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Uploaded object not found" });
      return;
    }
    req.log.error({ err: error }, "Error finalizing private upload");
    res.status(500).json({ error: "Failed to finalize upload" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const user = (req as Request & { user: { id: number; isAdmin: boolean } }).user;
    const canAccess = user.isAdmin || await objectStorageService.canAccessObjectEntity({
      userId: String(user.id),
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
