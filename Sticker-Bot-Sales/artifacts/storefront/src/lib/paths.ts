/** Build a URL relative to the artifact base path. */
export function path(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!p.startsWith("/")) p = "/" + p;
  return base + p;
}

/** Build an API URL against the deployed API service, never the static-site host. */
export function apiUrl(p: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  if (!p.startsWith("/")) p = "/" + p;
  return apiBase + base + "/api" + p;
}
