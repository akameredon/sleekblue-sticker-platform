import { Link } from "wouter";
import {
  useGetShopInfo,
  useGetShopStats,
  useListCategories,
  useListFeaturedProducts,
} from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentlyViewed } from "@/lib/recentlyViewed";
import { useListProducts } from "@workspace/api-client-react";
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Layers,
  MessageCircle,
  Package,
  Palette,
  Scissors,
  Shapes,
  Sparkles,
  Sun,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, Layers, Scissors, Shapes, Droplets, Package, Sun, Palette,
};

export function HomePage() {
  const { data: shop } = useGetShopInfo();
  const { data: stats } = useGetShopStats();
  const { data: categories } = useListCategories();
  const { data: featured, isLoading: loadingFeat } = useListFeaturedProducts();
  const recentSlugs = useRecentlyViewed();
  const { data: allProducts } = useListProducts();
  const recentProducts = (allProducts ?? []).filter((p) => recentSlugs.includes(p.slug));
  recentProducts.sort((a, b) => recentSlugs.indexOf(a.slug) - recentSlugs.indexOf(b.slug));

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 80% 20%, hsl(48 100% 60% / 0.45), transparent 60%), radial-gradient(50% 60% at 10% 90%, hsl(330 80% 70% / 0.35), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-12 md:px-6 md:pt-20 md:pb-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Premium 3.2mil vinyl · printed in Lagos
              </span>
              <h1 className="mt-4 font-serif text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Stickers that <span className="text-accent">stick</span>,
                <br />
                designed to <span className="text-accent">show off</span>.
              </h1>
              <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
                {shop?.tagline ??
                  "Premium die-cut vinyl stickers, made in Lagos. Designed to outlast your laptop."}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/shop">
                  <Button size="lg" data-testid="button-hero-shop">
                    Browse the shop
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button size="lg" variant="outline" data-testid="button-hero-chat">
                    <MessageCircle className="h-4 w-4" />
                    Get a custom quote
                  </Button>
                </Link>
              </div>
              {stats ? (
                <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Customers</dt>
                    <dd className="font-serif text-2xl font-semibold">{stats.happyCustomers.toLocaleString()}+</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Designs</dt>
                    <dd className="font-serif text-2xl font-semibold">{stats.totalProducts * stats.totalCategories}+</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Lead time</dt>
                    <dd className="font-serif text-2xl font-semibold">{stats.averageLeadTimeDays}d</dd>
                  </div>
                </dl>
              ) : null}
            </div>

            <div className="relative">
              <StickerCollage />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</div>
            <h2 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">Pick your style</h2>
          </div>
          <Link href="/shop" className="hidden text-sm font-medium underline-offset-4 hover:underline md:inline">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {(categories ?? []).map((cat) => {
            const Icon = ICONS[cat.icon] ?? Sparkles;
            return (
              <Link
                key={cat.slug}
                href={`/shop?category=${cat.slug}`}
                className="group flex flex-col rounded-2xl border border-card-border bg-card p-5 hover-elevate"
                data-testid={`card-category-${cat.slug}`}
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold">{cat.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                <div className="mt-3 text-xs text-muted-foreground">{cat.productCount} {cat.productCount === 1 ? "product" : "products"}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Featured</div>
            <h2 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">Fresh off the cutter</h2>
          </div>
          <Link href="/shop" className="hidden text-sm font-medium underline-offset-4 hover:underline md:inline">
            Shop everything →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loadingFeat
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[420px] rounded-2xl" />
              ))
            : (featured ?? []).map((p, i) => (
                <ProductCard key={p.slug} product={p} rotate={(i % 3 - 1) * 2} />
              ))}
        </div>
      </section>

      {/* RECENTLY VIEWED */}
      {recentProducts.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-4 md:px-6 md:pb-6" data-testid="section-recently-viewed">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently viewed</div>
          <h2 className="mt-1 font-serif text-2xl font-semibold md:text-3xl">Pick up where you left off</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentProducts.slice(0, 4).map((p, i) => (
              <ProductCard key={p.slug} product={p} rotate={(i % 2 === 0 ? -1 : 1) * 1.5} />
            ))}
          </div>
        </section>
      ) : null}

      {/* HOW IT WORKS */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</div>
          <h2 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">From idea to peel-and-stick</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Palette,
                title: "1. Pick or upload",
                body: "Choose from our shop, or chat with our AI to get a quote on a custom shape, size, and finish.",
              },
              {
                icon: Scissors,
                title: "2. We print & cut",
                body: "Premium 3.2mil vinyl. Eco-solvent inks. Precision die-cutting on every order.",
              },
              {
                icon: Truck,
                title: "3. Pickup or delivery",
                body: shop?.deliveryNote ?? "Free pickup in Lekki. Doorstep delivery quoted on chat.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-card-border bg-card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why Sticker Lab</div>
            <h2 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">
              Made for founders, creators & brands that ship.
            </h2>
            <ul className="mt-6 space-y-4 text-sm">
              {[
                "Weatherproof, dishwasher-safe and UV-stable for 5+ years outdoors.",
                "Tiered pricing — bigger packs land below ₦150 a sticker.",
                "AI assistant for instant quotes on custom shapes and finishes.",
                "Made in Lagos with fast turnaround and friendly humans on WhatsApp.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {shop ? (
              <a
                href={whatsappUrl(shop.whatsappNumber, "Hi Sticker Lab! I'd like to ask about an order.")}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover-elevate"
                data-testid="link-whatsapp-why"
              >
                <MessageCircle className="h-4 w-4" />
                Talk to us on WhatsApp
              </a>
            ) : null}
          </div>
          <div className="rounded-3xl border border-card-border bg-card p-8 shadow-md">
            <blockquote className="font-serif text-2xl leading-snug">
              “Ordered 200 die-cut logos for our launch event. Showed up in 3 days,
              and they’ve survived the rainy season on every laptop. Perfect.”
            </blockquote>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground font-semibold">A</div>
              <div>
                <div className="text-sm font-semibold">Ada O.</div>
                <div className="text-xs text-muted-foreground">Founder · Lagos</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StickerCollage() {
  const items = [
    { color1: "#FFE066", color2: "#FF6B9D", label: "STICKER", rot: -8, top: "0%", left: "10%", size: 180 },
    { color1: "#7CDEC2", color2: "#3D5AFE", label: "LAB", rot: 12, top: "10%", left: "55%", size: 150 },
    { color1: "#FFB17A", color2: "#E63946", label: "LAGOS", rot: -5, top: "50%", left: "0%", size: 160 },
    { color1: "#C7B8FF", color2: "#FF7BAC", label: "AI", rot: 6, top: "55%", left: "45%", size: 200 },
    { color1: "#A0E8AF", color2: "#0E7C66", label: "VINYL", rot: -12, top: "30%", left: "30%", size: 130 },
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: it.top,
            left: it.left,
            width: it.size,
            height: it.size,
            transform: `rotate(${it.rot}deg)`,
            background: `radial-gradient(circle at 30% 30%, ${it.color1}, ${it.color1} 60%, ${it.color2})`,
            borderRadius: "9999px",
            display: "grid",
            placeItems: "center",
            boxShadow: "inset 0 0 0 5px white, 0 12px 28px rgba(0,0,0,.18)",
          }}
        >
          <span style={{ fontFamily: "Fraunces, serif", fontWeight: 700, color: "#0e1626", letterSpacing: "-0.04em", fontSize: it.size * 0.18 }}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}
