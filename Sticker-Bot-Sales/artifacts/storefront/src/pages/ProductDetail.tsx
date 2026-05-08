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
import { ArrowRight, CheckCircle2, ChevronLeft, Heart, ShoppingBag, Sparkles, Star } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug, sizeLabel, finishLabel, quantity, customW, customH, isCustomSize]);

  const quote = quoteMutation.data;

  const tierHints = useMemo(() => product?.quantityTiers ?? [], [product]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
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
            {product.isBestseller ? (
              <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground sticker-rotate-1">
                Bestseller
              </span>
            ) : null}
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
        </div>

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
          <p className="mt-2 text-base text-muted-foreground">{product.tagline}</p>
          {product.rating > 0 ? (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-current text-primary" />
              <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
              <span>·</span>
              <span>{product.reviewCount} reviews</span>
            </div>
          ) : null}
          <p className="mt-5 text-sm leading-relaxed">{product.description}</p>

          {/* SIZE */}
          <Section title="Size">
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <Pill key={s.label} active={sizeLabel === s.label} onClick={() => setSizeLabel(s.label)}>
                  {s.label}
                  {s.label !== "Custom" ? (
                    <span className="ml-1 text-xs opacity-70">{s.widthMm}×{s.heightMm}mm</span>
                  ) : null}
                </Pill>
              ))}
            </div>
            {isCustomSize ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <NumField label="Width (mm)" value={customW} onChange={setCustomW} min={20} max={300} />
                <NumField label="Height (mm)" value={customH} onChange={setCustomH} min={20} max={300} />
              </div>
            ) : null}
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
            {finishLabel ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {product.finishes.find((f) => f.label === finishLabel)?.description}
              </p>
            ) : null}
          </Section>

          {/* QUANTITY */}
          <Section title="Quantity">
            <div className="flex flex-wrap gap-2">
              {tierHints.map((t) => (
                <Pill key={t.minQty} active={quantity === t.minQty} onClick={() => setQuantity(t.minQty)}>
                  {t.label}
                </Pill>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <NumField
                label=""
                value={quantity}
                onChange={(v) => setQuantity(Math.max(1, v))}
                min={1}
                max={5000}
                inline
              />
              <span className="text-xs text-muted-foreground">stickers</span>
            </div>
          </Section>

          {/* QUOTE */}
          <div className="mt-6 rounded-2xl border border-card-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Live quote</div>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            {quoteMutation.isPending && !quote ? (
              <Skeleton className="mt-3 h-20" />
            ) : quote ? (
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-serif font-semibold">{formatNGN(quote.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatNGN(quote.unitPrice)}/sticker
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
                {quote.savingsNote ? (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                    <span className="text-foreground">{quote.savingsNote}</span>
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">
                  Lead time {quote.leadTimeDays} days · {formatNumber(quantity)} stickers
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">Pick a size and finish to see your price.</div>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" size="lg" onClick={handleAdd} disabled={!quote} data-testid="button-add-cart">
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
            {shop ? (
              <a
                href={whatsappUrl(
                  shop.whatsappNumber,
                  `Hi! I'd like a quote for ${product.name} — ${sizeLabel}, ${finishLabel}, ${quantity} pcs.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs text-muted-foreground hover:underline"
                data-testid="link-whatsapp-product"
              >
                Or message us directly on WhatsApp →
              </a>
            ) : null}
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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium hover-elevate ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  inline,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  inline?: boolean;
}) {
  return (
    <label className={inline ? "inline-flex flex-col" : "flex flex-col"}>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-28 rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
