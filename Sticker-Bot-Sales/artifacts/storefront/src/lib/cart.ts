import { useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";

export type CartItem = {
  id: string;
  productSlug?: string;
  productName: string;
  imageUrl?: string;
  sizeLabel: string;
  finishLabel: string;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
  unitPrice: number;
  notes?: string;
};

const CartItemSchema = z.object({
  id: z.string(),
  productSlug: z.string().optional(),
  productName: z.string(),
  imageUrl: z.string().optional(),
  sizeLabel: z.string(),
  finishLabel: z.string(),
  quantity: z.number().min(1),
  widthMm: z.number().optional(),
  heightMm: z.number().optional(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().optional(),
});

const CartSchema = z.array(CartItemSchema);

const STORAGE_KEY = "stickerlab.cart";

function loadInitial(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const result = CartSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

let cartState: CartItem[] = loadInitial();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartState));
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
  return cartState;
}

function getServerSnapshot() {
  return [] as CartItem[];
}

function makeId(item: Omit<CartItem, "id">): string {
  return [
    item.productSlug ?? "custom",
    item.sizeLabel,
    item.finishLabel,
    item.widthMm ?? "",
    item.heightMm ?? "",
  ].join("|");
}

export const cart = {
  add(item: Omit<CartItem, "id">) {
    const id = makeId(item);
    const existingIdx = cartState.findIndex((i) => i.id === id);
    if (existingIdx >= 0) {
      const next = [...cartState];
      const existing = next[existingIdx]!;
      next[existingIdx] = {
        ...existing,
        quantity: existing.quantity + item.quantity,
        unitPrice: item.unitPrice,
      };
      cartState = next;
    } else {
      cartState = [...cartState, { ...item, id }];
    }
    emit();
  },
  update(id: string, updates: Partial<CartItem>) {
    cartState = cartState.map((i) => (i.id === id ? { ...i, ...updates } : i));
    emit();
  },
  remove(id: string) {
    cartState = cartState.filter((i) => i.id !== id);
    emit();
  },
  clear() {
    cartState = [];
    emit();
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCartCount(): number {
  const items = useCart();
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function useCartSubtotal(): number {
  const items = useCart();
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

/** Hydration helper for SSR-safe client-only rendering */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
