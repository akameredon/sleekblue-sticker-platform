import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useCalculateQuote,
  useGetProductBySlug,
  useGetShopInfo,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StickerImage } from "@/components/StickerImage";
import { Reviews } from "@/components/Reviews";
import { formatNGN, formatNumber } from "@/lib/format";
import { cart } from "@/lib/cart";
import { wishlist, useWishlistHas, useHasMounted } from "@/lib/wishlist";
import { recentlyViewed } from "@/lib/recentlyViewed";
import {
  ArrowRight, CheckCircle2, ChevronLeft, Eye, Heart, Lock, RefreshCw,
  ShieldCheck, ShoppingBag, Sparkles, Star, TrendingUp, Truck, Zap,
} from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

function seedHash(str: string, salt: number) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug ?? "";
  const [, navigate] = useLocation();

  const { data: product, isLoading, isError } = useGetProductBySlug(slug);
  const { data: shop } = useGetShopInfo();

  const [sizeLabel, setSizeLabel] = useState<string>("");
  const [finishLabel, setFinishLabel] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(50);
  const [customW, setCustomW] = useState<number>(60);
  const [customH, setCustomH] = useState<number>(60);

  useEffect(() => {
    if (product) {
      setSizeLabel((s) => s || product.sizes[0]?.label || "");
      setFinishLabel((f) => f || product.finishes[0]?.label || "");
      const firstTier = product.quantityTiers[0];
      setQuantity((q) => (q === 50 && firstTier ? firstTier.minQty : q));
      recentlyViewed.push(product.slug);
    }
  }, [product]);

  const wished = useWishlistHas(slug);
  const mounted = useHasMounted();
  const isCustomSize = sizeLabel === "Custom";
  const quoteMutation = useCalculateQuote();

  useEffect(() => {
    if (!product || !sizeLabel || !finishLabel) return;
    const id = setTimeout(() => {
      quoteMutation.mutate({
        data: {
          productSlug: product.slug,
          sizeLabel,
          finishLabel,
          quantity,
          ...(isCustomSize ? { widthMm: customW, heightMm: customH } : {}),
        },
      });
    }, 200);
    return () => clearTimeout(id);
  }, [product?.slug, sizeLabel, finishLabel, quantity, customW, customH, isCustomSize]);

  const quote = quoteMutation.data;
  const tierHints = useMemo(() => product?.quantityTiers ?? [], [product]);

  // Psychology signals derived deterministically from slug
  const viewing = product ? (seedHash(product.slug, 7) % 19) + 6 : 0;
  const weeklyOrders = product ? (seedHash(product.slug, 13) % 44) + 18 : 0;
  const slotsLeft = product ? (seedHash(product.slug, 31) % 4) + 2 : 3;

  // Delivery estimate
  const today = new Date();
  const leadDays = shop?.leadTimeDays ?? 3;
  const deliverBy = new Date(today);
  deliverBy.setDate(today.getDate() + leadDays + 1);
  const orderBy = new Date(today);
  orderBy.setDate(today.getDate() + 1);
  const fmtDay = (d: Date) => d.toLocaleDateString("en-NG", { weekday: "long" });

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 md:px-6"><Skeleton className="h-[400px] rounded-2xl" /></div>;
  }
  if (isError || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
        <h1 className="font-serif text-3xl font-semibold">Sticker not found</h1>
        <p className="mt-2 text-muted-foreground">It may have moved or been retired.</p>
        <Link href="/shop"><Button className="mt-6">Back to shop</Button></Link>
      </div>
    );
  }

  const handleAdd = () => {
    if (!quote) return;
    cart.add({
      productSlug: product.slug,
      productName: product.name,
      imageUrl: product.imageUrl,
      sizeLabel,
      finishLabel,
      quantity,
      widthMm: isCustomSize ? customW : undefined,
      heightMm: isCustomSize ? customH : undefined,
      unitPrice: quote.unitPrice,
    });
    navigate("/cart");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        {/* LEFT — Image + specs */}
        <div>
          <div
            className="relative aspect-square overflow-hidden rounded-3xl border border-card-border bg-card grain"
            style={{ background: "radial-gradient(80% 80% at 50% 30%, hsl(48 100% 80% / 0.4), transparent 70%)" }}
          >
            <StickerImage
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover p-8"
              rotate={-3}
            />
            {product.isBestseller && (
              <span className="absolute left-4 top-4 badge-hot sticker-rotate-1">🔥 Bestseller</span>
            )}
            {/* Viewing now */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs font-medium">
              <Eye className="h-3.5 w-3.5 text-accent" />
              {viewing} people viewing this now
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Material", value: product.material },
              { label: "Lead time", value: `${shop?.leadTimeDays ?? 3} days` },
              { label: "Min qty", value: formatNumber(product.quantityTiers[0]?.minQty ?? 1) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-card-border bg-card px-3 py-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-sm font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Social proof strip */}
          <div className="mt-4 rounded-xl border border-card-border bg-muted/40 px-4 py-3 flex items-center gap-3 text-sm">
            <TrendingUp className="h-4 w-4 text-orange-500 shrink-0" />
            <span><strong>{weeklyOrders} people</strong> ordered this in the past 7 days</span>
          </div>
        </div>

        {/* RIGHT — Details + buy box */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{product.categoryName}</div>
              <h1 className="mt-1 font-serif text-3xl font-semibold leading-tight md:text-4xl">{product.name}</h1>
            </div>
            <button
              type="button"
              onClick={() => wishlist.toggle(slug)}
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-border bg-card hover-elevate"
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              data-testid="button-wish-product"
            >
              <Heart className={mounted && wished ? "h-4 w-4 fill-current text-accent" : "h-4 w-4 text-muted-foreground"} />
            </button>
          </div>

          {product.rating > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-current text-yellow-400" : "text-muted-foreground/30"}`} />
              ))}
              <span className="font-semibold text-foreground ml-1">{product.rating.toFixed(1)}</span>
              <span>·</span>
              <span>{product.reviewCount} reviews</span>
            </div>
          )}

          <p className="mt-2 text-base text-muted-foreground">{product.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed">{product.description}</p>

          {/* SCARCITY BAR */}
          <div className="mt-5 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-4 py-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Only {slotsLeft} production slots left this week
              </span>
              <span className="text-xs text-orange-600 dark:text-orange-400 opacity-70">{slotsLeft}/{slotsLeft + 7} remaining</span>
            </div>
            <div className="scarcity-bar">
              <div className="scarcity-bar-fill" style={{ width: `${100 - (slotsLeft / (slotsLeft + 7)) * 100}%` }} />
            </div>
          </div>

          {/* SIZE */}
          <Section title="Size">
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <Pill key={s.label} active={sizeLabel === s.label} onClick={() => setSizeLabel(s.label)}>
                  {s.label}
                  {s.label !== "Custom" && <span className="ml-1 text-xs opacity-70">{s.widthMm}×{s.heightMm}mm</span>}
                </Pill>
              ))}
            </div>
            {isCustomSize && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumField label="Width (mm)" value={customW} onChange={setCustomW} min={20} max={300} />
                <NumField label="Height (mm)" value={customH} onChange={setCustomH} min={20} max={300} />
              </div>
            )}
          </Section>

          {/* FINISH */}
          <Section title="Finish">
            <div className="flex flex-wrap gap-2">
              {product.finishes.map((f) => (
                <Pill key={f.label} active={finishLabel === f.label} onClick={() => setFinishLabel(f.label)}>
                  {f.label}
                </Pill>
              ))}
            </div>
            {finishLabel && (
              <p className="mt-2 text-xs text-muted-foreground">
                {product.finishes.find((f) => f.label === finishLabel)?.description}
              </p>
            )}
          </Section>

          {/* QUANTITY with anchoring */}
          <Section title="Quantity">
            <div className="flex flex-wrap gap-2">
              {tierHints.map((t) => (
                <Pill key={t.minQty} active={quantity === t.minQty} onClick={() => setQuantity(t.minQty)}>
                  {t.label}
                  {t.minQty >= 100 && <span className="ml-1 savings-pill">Best value</span>}
                </Pill>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <NumField label="" value={quantity} onChange={(v) => setQuantity(Math.max(1, v))} min={1} max={5000} inline />
              <span className="text-xs text-muted-foreground">stickers</span>
            </div>
            {quantity < 100 && (
              <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                💡 Step up to 100 and save ≈ ₦8,500 vs two small orders
              </p>
            )}
          </Section>

          {/* LIVE QUOTE */}
          <div className="mt-6 rounded-2xl border border-card-border bg-card p-5 gradient-border">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Live quote</div>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>

            {quoteMutation.isPending && !quote ? (
              <Skeleton className="mt-3 h-20" />
            ) : quote ? (
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-3xl font-serif font-semibold">{formatNGN(quote.total)}</div>
                    <div className="price-was">{formatNGN(Math.round(quote.total * 1.18))} without bulk discount</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{formatNGN(quote.unitPrice)}/sticker</div>
                    <div className="savings-pill mt-1">You save {Math.round(18)}%</div>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 text-sm">
                  {quote.breakdown.map((b) => (
                    <li key={b.label} className="flex justify-between text-muted-foreground">
                      <span>{b.label}</span>
                      <span>{b.amount === 0 ? "—" : formatNGN(b.amount)}</span>
                    </li>
                  ))}
                </ul>

                {quote.savingsNote && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-foreground">{quote.savingsNote}</span>
                  </div>
                )}

                {/* Delivery urgency */}
                <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>Order by <strong className="text-foreground">{fmtDay(orderBy)}</strong> → delivered by <strong className="text-foreground">{fmtDay(deliverBy)}</strong></span>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">Pick a size and finish to see your price.</div>
            )}

            {/* CTA */}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1 btn-glow-accent"
                size="lg"
                onClick={handleAdd}
                disabled={!quote}
                data-testid="button-add-cart"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to cart
              </Button>
              <Link href="/chat" className="flex-1">
                <Button variant="outline" size="lg" className="w-full" data-testid="button-ask-ai">
                  Ask AI about this
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Trust stack */}
            <div className="mt-4 trust-strip text-[11px] justify-center">
              <span className="trust-strip-item"><Lock className="h-3 w-3" /> Secure checkout</span>
              <span className="trust-strip-item"><RefreshCw className="h-3 w-3" /> Free revisions</span>
              <span className="trust-strip-item"><ShieldCheck className="h-3 w-3" /> Quality guaranteed</span>
            </div>

            {shop && (
              <a
                href={whatsappUrl(shop.whatsappNumber, `Hi! I'd like a quote for ${product.name} — ${sizeLabel}, ${finishLabel}, ${quantity} pcs.`)}
                target="_blank" rel="noreferrer"
                className="mt-3 block text-center text-xs text-muted-foreground hover:underline"
                data-testid="link-whatsapp-product"
              >
                Or message us directly on WhatsApp →
              </a>
            )}
          </div>
        </div>
      </div>

      <Reviews slug={product.slug} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium hover-elevate transition-all flex items-center gap-1 ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function NumField({ label, value, onChange, min, max, inline }: {
  label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; inline?: boolean;
}) {
  return (
    <label className={inline ? "inline-flex flex-col" : "flex flex-col"}>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min} max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-28 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
