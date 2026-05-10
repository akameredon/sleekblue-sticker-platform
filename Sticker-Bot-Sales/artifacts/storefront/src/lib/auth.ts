/**
 * auth.ts — Client-side auth helpers.
 * Token stored in localStorage. Exported hooks consumed by pages.
 */

const TOKEN_KEY = "sl_auth_token";
const USER_KEY = "sl_auth_user";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
};

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

export function setAuth(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* storage blocked */ }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken() && getUser());
}

/** Attach Authorization header to fetch options */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
