import { useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";

const STORAGE_KEY = "stickerlab.wishlist";
const WishlistSchema = z.array(z.string());

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = WishlistSchema.safeParse(parsed);
    return result.success ? result.data : [];
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
    } catch (e) {
      // Log storage errors (e.g. QuotaExceededError) but don't crash the UI
      console.error("Wishlist sync failed:", e);
      // If storage is full, we still keep the in-memory state for the current session
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

export const wishlist = {
  add(slug: string) {
    if (!state.includes(slug)) {
      state = [...state, slug];
      emit();
    }
  },
  remove(slug: string) {
    if (state.includes(slug)) {
      state = state.filter((s) => s !== slug);
      emit();
    }
  },
  toggle(slug: string) {
    if (state.includes(slug)) this.remove(slug);
    else this.add(slug);
  },
  has(slug: string): boolean {
    return state.includes(slug);
  },
  clear() {
    state = [];
    emit();
  },
};

export function useWishlist(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useWishlistHas(slug: string): boolean {
  const all = useWishlist();
  return all.includes(slug);
}

export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
