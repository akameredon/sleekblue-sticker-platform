import { useSyncExternalStore } from "react";

const STORAGE_KEY = "stickerlab.recent";
const MAX_ITEMS = 8;

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

let state: string[] = load();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return [] as string[];
}

export const recentlyViewed = {
  push(slug: string) {
    const next = [slug, ...state.filter((s) => s !== slug)].slice(0, MAX_ITEMS);
    state = next;
    emit();
  },
  clear() {
    state = [];
    emit();
  },
};

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
