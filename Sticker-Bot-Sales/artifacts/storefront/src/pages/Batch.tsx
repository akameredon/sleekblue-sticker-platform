import { useCallback, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cart } from "@/lib/cart";
import { formatNGN } from "@/lib/format";
import { apiUrl } from "@/lib/paths";
import {
  ChevronLeft,
  Layers,
  Loader2,
  Plus,
  ShoppingBag,
  Trash2,
  Zap,
} from "lucide-react";

type Row = {
  id: string;
  productSlug: string;
  sizeLabel: string;
  finishLabel: string;
  quantity: number;
};

type QuoteResult = {
  unitPrice: number;
  subtotal: number;
  total: number;
  savingsNote?: string;
  leadTimeDays: number;
};

type RowResult = Row & { result: QuoteResult | null; loading: boolean; error: string | null };

const SIZES = ["Small", "Medium", "Large", "Custom"];
const FINISHES = ["Matte", "Gloss", "Holographic"];
const PRODUCTS = [
  { label: "Die-Cut", slug: "die-cut-stickers" },
  { label: "Circle", slug: "circle-stickers" },
  { label: "Kiss-Cut", slug: "kiss-cut-stickers" },
  { label: "Holographic", slug: "holographic-stickers" },
  { label: "Bumper", slug: "bumper-stickers" },
];

function makeRow(): RowResult {
  return {
    id: Math.random().toString(36).slice(2),
    productSlug: "die-cut-stickers",
    sizeLabel: "Medium",
    finishLabel: "Matte",
    quantity: 100,
    result: null,
    loading: false,
    error: null,
  };
}

export function BatchPage() {
  const [rows, setRows] = useState<RowResult[]>([makeRow(), makeRow()]);
  const [running, setRunning] = useState(false);

  const updateRow = (id: string, updates: Partial<RowResult>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates, result: null } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  const runAll = useCallback(async () => {
    setRunning(true);
    setRows((prev) => prev.map((r) => ({ ...r, loading: true, error: null, result: null })));

    await Promise.all(
      rows.map(async (row) => {
        try {
          const res = await fetch(apiUrl("/pricing/quote"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productSlug: row.productSlug,
              sizeLabel: row.sizeLabel,
              finishLabel: row.finishLabel,
              quantity: row.quantity,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, result: json, loading: false } : r)),
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Quote failed";
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, error: msg, loading: false } : r)),
          );
        }
      }),
    );

    setRunning(false);
  }, [rows]);

  const addAllToCart = () => {
    for (const r of rows) {
      if (!r.result) continue;
      cart.add({
        productSlug: r.productSlug,
        productName: PRODUCTS.find((p) => p.slug === r.productSlug)?.label ?? r.productSlug,
        sizeLabel: r.sizeLabel,
        finishLabel: r.finishLabel,
        quantity: r.quantity,
        unitPrice: r.result.unitPrice,
      });
    }
  };

  const hasResults = rows.some((r) => r.result);
  const grandTotal = rows.reduce((sum, r) => sum + (r.result?.total ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back to shop
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill 3 · Distributed Batch Processing</div>
            <h1 className="font-serif text-2xl font-semibold md:text-3xl">Batch Quote Estimator</h1>
          </div>
        </div>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Compare pricing for multiple sticker configurations in one shot. Add up to 10 rows and quote them all simultaneously.
        </p>
      </header>

      <div className="mt-8 space-y-3">
        <div className="hidden grid-cols-[1fr_1fr_1fr_120px_1fr_40px] gap-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
          <span>Product</span>
          <span>Size</span>
          <span>Finish</span>
          <span>Quantity</span>
          <span>Quote</span>
          <span />
        </div>

        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="rounded-2xl border border-card-border bg-card p-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
            data-testid={`batch-row-${idx}`}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_120px_1fr_40px] sm:items-center">
              <select
                value={row.productSlug}
                onChange={(e) => updateRow(row.id, { productSlug: e.target.value })}
                className="col-span-2 rounded-lg border border-input bg-card px-3 py-2 text-sm sm:col-span-1"
                data-testid={`select-product-${idx}`}
              >
                {PRODUCTS.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.label}</option>
                ))}
              </select>
              <select
                value={row.sizeLabel}
                onChange={(e) => updateRow(row.id, { sizeLabel: e.target.value })}
                className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
              >
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={row.finishLabel}
                onChange={(e) => updateRow(row.id, { finishLabel: e.target.value })}
                className="rounded-lg border border-input bg-card px-3 py-2 text-sm"
              >
                {FINISHES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <input
                type="number"
                min={1}
                max={5000}
                value={row.quantity}
                onChange={(e) => updateRow(row.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                className="rounded-lg border border-input bg-card px-3 py-2 text-sm w-full"
                data-testid={`input-qty-${idx}`}
              />
              <div className="col-span-2 sm:col-span-1">
                {row.loading ? (
                  <Skeleton className="h-10 rounded-lg" />
                ) : row.error ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {row.error}
                  </div>
                ) : row.result ? (
                  <div className="rounded-xl border border-card-border bg-muted/40 px-3 py-2">
                    <div className="font-semibold">{formatNGN(row.result.total)}</div>
                    <div className="text-[11px] text-muted-foreground">{formatNGN(row.result.unitPrice)}/u · {row.result.leadTimeDays}d</div>
                    {row.result.savingsNote ? (
                      <div className="mt-1 text-[11px] text-accent">{row.result.savingsNote}</div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground px-1">—</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover-elevate col-span-1 sm:col-span-1 justify-self-end sm:justify-self-auto"
                aria-label="Remove row"
                disabled={rows.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= 10}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/40 py-3 text-sm text-muted-foreground hover-elevate disabled:opacity-40"
          data-testid="button-add-row"
        >
          <Plus className="h-4 w-4" />
          Add row ({rows.length}/10)
        </button>
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {hasResults ? (
            <div className="text-sm">
              <span className="text-muted-foreground">Grand total estimate: </span>
              <span className="font-semibold text-lg">{formatNGN(grandTotal)}</span>
            </div>
          ) : null}
        </div>
        <div className="flex gap-3">
          {hasResults ? (
            <Link href="/cart">
              <Button variant="outline" onClick={addAllToCart} data-testid="button-add-all-cart">
                <ShoppingBag className="h-4 w-4" />
                Add all to cart
              </Button>
            </Link>
          ) : null}
          <Button
            size="lg"
            onClick={runAll}
            disabled={running || rows.length === 0}
            data-testid="button-run-all"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {running ? `Quoting ${rows.length} rows…` : `Quote all ${rows.length} configurations`}
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-card-border bg-card p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Why batch quotes?</div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Brands ordering multiple sticker styles can compare pricing scenarios simultaneously — comparing finishes, sizes, and volumes in one click instead of navigating between product pages. All quotes run in parallel using the same pricing engine as the shop.
        </p>
      </div>
    </div>
  );
}
