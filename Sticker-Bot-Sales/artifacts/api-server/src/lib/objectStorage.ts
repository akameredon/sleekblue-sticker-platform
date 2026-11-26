import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  setObjectAclPolicy,
} from "./objectAcl";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface StoredObjectRef {
  bucket: string;
  path: string;
  objectPath: string;
  isPublic?: boolean;
}

function supabaseConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured on the API server.");
  }
  return { url, key };
}

function privateBucketConfig(): { bucket: string; prefix: string } {
  const configured = process.env.SUPABASE_ARTWORK_BUCKET || process.env.PRIVATE_OBJECT_DIR || "";
  const parts = configured.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (!parts.length) throw new Error("SUPABASE_ARTWORK_BUCKET must name an existing private Supabase Storage bucket.");
  return { bucket: parts[0], prefix: parts.slice(1).join("/") };
}

function storageUrl(bucket: string, path: string, mode: "object" | "public" | "signed"): string {
  const { url } = supabaseConfig();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const route = mode === "public" ? "object/public" : mode === "signed" ? "object/upload/sign" : "object";
  return `${url}/storage/v1/${route}/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function storageRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const { key } = supabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  return fetch(url, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(30_000) });
}

export class ObjectStorageService {
  getPublicObjectSearchPaths(): string[] {
    return Array.from(new Set((process.env.PUBLIC_OBJECT_SEARCH_PATHS || "")
      .split(",").map((path) => path.trim().replace(/^\/+|\/+$/g, "")).filter(Boolean)));
  }

  getPrivateObjectDir(): string {
    return privateBucketConfig().bucket;
  }

  async searchPublicObject(filePath: string): Promise<StoredObjectRef | null> {
    const safePath = filePath.replace(/^\/+/, "");
    if (!safePath || safePath.split("/").some((part) => part === "..")) return null;
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const [bucket, ...prefixParts] = searchPath.split("/");
      const path = [...prefixParts, safePath].filter(Boolean).join("/");
      const response = await storageRequest(storageUrl(bucket, path, "public"), { method: "HEAD" });
      if (response.ok) return { bucket, path, objectPath: `public:${bucket}/${path}`, isPublic: true };
      if (response.status !== 404) throw new Error(`Supabase Storage public object lookup failed (${response.status}).`);
    }
    return null;
  }

  async downloadObject(file: StoredObjectRef, cacheTtlSec = 3600): Promise<Response> {
    const url = storageUrl(file.bucket, file.path, file.isPublic ? "public" : "object");
    const response = await storageRequest(url);
    if (response.status === 404) throw new ObjectNotFoundError();
    if (!response.ok) throw new Error(`Supabase Storage download failed (${response.status}).`);
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    headers.set("Cache-Control", `${file.isPublic ? "public" : "private, no-store"}, max-age=${file.isPublic ? cacheTtlSec : 0}`);
    const length = response.headers.get("Content-Length");
    if (length) headers.set("Content-Length", length);
    return new Response(response.body, { status: 200, headers });
  }

  async getObjectEntityUploadURL(userId: number): Promise<string> {
    const { bucket, prefix } = privateBucketConfig();
    const objectId = randomUUID();
    const path = [...(prefix ? [prefix] : []), "uploads", String(userId), objectId].join("/");
    const response = await storageRequest(storageUrl(bucket, path, "signed"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upsert: false }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Could not create a signed Supabase Storage upload URL (${response.status}). ${detail.slice(0, 300)}`);
    }
    const data = await response.json() as { url?: string; signedUrl?: string; signedURL?: string; token?: string };
    const directSignedUrl = data.signedUrl || data.signedURL;
    if (directSignedUrl) {
      if (directSignedUrl.startsWith("http")) return directSignedUrl;
      const { url } = supabaseConfig();
      if (directSignedUrl.startsWith("/storage/v1/")) return `${url}${directSignedUrl}`;
      return `${url}/storage/v1${directSignedUrl.startsWith("/") ? "" : "/"}${directSignedUrl}`;
    }
    if (!data.url || !data.token) {
      throw new Error("Supabase Storage did not return both the signed upload path and token.");
    }
    const { url } = supabaseConfig();
    const signedPath = data.url.startsWith("/") ? data.url : `/${data.url}`;
    const apiPath = signedPath.startsWith("/storage/v1/") ? signedPath : `/storage/v1${signedPath}`;
    const separator = apiPath.includes("?") ? "&" : "?";
    return `${url}${apiPath}${separator}token=${encodeURIComponent(data.token)}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<StoredObjectRef> {
    if (!objectPath.startsWith("/objects/") || objectPath.includes("..")) throw new ObjectNotFoundError();
    const { bucket, prefix } = privateBucketConfig();
    const relative = objectPath.slice("/objects/".length);
    const path = [...(prefix ? [prefix] : []), relative].join("/");
    const response = await storageRequest(storageUrl(bucket, path, "object"), { method: "HEAD" });
    if (response.status === 404) throw new ObjectNotFoundError();
    if (!response.ok) throw new Error(`Supabase Storage object check failed (${response.status}).`);
    return { bucket, path, objectPath };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    try {
      const url = new URL(rawPath);
      const marker = "/storage/v1/object/upload/sign/";
      const index = url.pathname.indexOf(marker);
      if (index < 0) return rawPath;
      const remainder = url.pathname.slice(index + marker.length);
      const slash = remainder.indexOf("/");
      if (slash < 1) return rawPath;
      const bucket = decodeURIComponent(remainder.slice(0, slash));
      const path = remainder.slice(slash + 1).split("/").map(decodeURIComponent).join("/");
      if (bucket !== privateBucketConfig().bucket || !path.startsWith("uploads/")) return rawPath;
      const { prefix } = privateBucketConfig();
      const relative = prefix && path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) : path;
      return `/objects/${relative}`;
    } catch {
      return rawPath;
    }
  }

  async trySetObjectEntityAclPolicy(rawPath: string, aclPolicy: ObjectAclPolicy): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(normalizedPath, aclPolicy);
    return objectFile.objectPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredObjectRef;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectPath: objectFile.objectPath,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
