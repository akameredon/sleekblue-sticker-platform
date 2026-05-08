/** Build a URL relative to the artifact base path. */
export function path(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!p.startsWith("/")) p = "/" + p;
  return base + p;
}

/** Build an API URL prefixed with the artifact base path + /api. */
export function apiUrl(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!p.startsWith("/")) p = "/" + p;
  return base + "/api" + p;
}
