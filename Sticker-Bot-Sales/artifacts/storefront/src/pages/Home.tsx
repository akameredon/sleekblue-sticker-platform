import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  useGetShopInfo,
  useGetShopStats,
  useListCategories,
  useListFeaturedProducts,
  useListProducts,
} from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentlyViewed } from "@/lib/recentlyViewed";
import {
  ArrowRight, BarChart2, CheckCircle2, Clock, Droplets, Layers,
  Lock, MessageCircle, Mic, Package, Palette, RefreshCw, Scissors,
  Shapes, ShieldCheck, Sparkles, Star, Sun, Truck, Upload, Wand2, X, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { whatsappUrl } from "@/lib/whatsapp";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, Layers, Scissors, Shapes, Droplets, Package, Sun, Palette,
};

const TICKER_EVENTS = [
  "🎨 Chidi just ordered 200 holographic stickers · Abuja · 2 min ago",
  "🔥 Ada placed a bulk order · 500 die-cut logos · Lagos · 5 min ago",
  "✅ Emeka's order shipped · Port Harcourt · 8 min ago",
  "🛒 Fatima just ordered 100 vinyl stickers · Kano · 11 min ago",
  "⚡ Kemi grabbed the last production slot this week · Lagos · 14 min ago",
  "🎨 Seun just generated a custom AI sticker design · Ibadan · 18 min ago",
  "🔥 Corporate batch · 1,000 stickers · TechStartup Lagos · 22 min ago",
  "✅ Taiwo's second order this month · 250 kiss-cut · Abuja · 26 min ago",
];

function LiveTicker() {
  return (
    <div className="border-b border-border bg-muted/40 overflow-hidden">
      <div className="relative flex items-center gap-3 py-2 px-4">
        <div className="flex items-center gap-1.5 shrink-0 z-10 bg-muted/40 pr-2">
          <span className="live-dot" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Live</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track gap-16">
            {[...TICKER_EVENTS, ...TICKER_EVENTS].map((evt, i) => (
              <span key={i} className="whitespace-nowrap text-[12px] text-foreground/80 font-medium">{evt}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UrgencyBanner({ onDismiss }: { onDismiss: () => void }) {
  const now = new Date();
  const friday = new Date(now);
  friday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7));
  const dayName = friday.toLocaleDateString("en-NG", { weekday: "long" });

  return (
    <div className="animate-slide-in-down bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm py-2.5 px-4">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">⚡ Only 6 production slots left this week.</span>
          <span className="opacity-90">Closes {dayName} midnight — secure yours now.</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/quick-order">
            <span className="rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-bold cursor-pointer whitespace-nowrap transition-colors">
              Order Now →
            </span>
          </Link>
          <button type="button" onClick={onDismiss} aria-label="Dismiss">
            <X className="h-4 w-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="trust-strip py-3 px-4 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl trust-strip">
        {[
          { icon: Lock, label: "Secure checkout" },
          { icon: ShieldCheck, label: "Quality guaranteed" },
          { icon: RefreshCw, label: "Free revisions" },
          { icon: Star, label: "4.9 / 5 from 1,200+ orders" },
          { icon: Clock, label: "3-day turnaround" },
          { icon: Truck, label: "Nationwide delivery" },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="trust-strip-item">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setShown(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={shown ? "animate-count-up" : "opacity-0"}>
      <dd className="font-serif text-2xl font-semibold">{value}</dd>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
    </div>
  );
}

export function HomePage() {
  const { data: shop } = useGetShopInfo();
  const { data: stats } = useGetShopStats();
  const { data: categories } = useListCategories();
  const { data: featured, isLoading: loadingFeat } = useListFeaturedProducts();
  const recentSlugs = useRecentlyViewed();
  const { data: allProducts } = useListProducts();
  const [urgencyDismissed, setUrgencyDismissed] = useState(false);

  const recentProducts = (allProducts ?? []).filter((p) => recentSlugs.includes(p.slug));
  recentProducts.sort((a, b) => recentSlugs.indexOf(a.slug) - recentSlugs.indexOf(b.slug));

  return (
    <div>
      {!urgencyDismissed && <UrgencyBanner onDismiss={() => setUrgencyDismissed(true)} />}
      <LiveTicker />
      <TrustStrip />

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
                {shop?.tagline ?? "Premium die-cut vinyl stickers, made in Lagos. Designed to outlast your laptop."}
              </p>

              {/* FOMO social proof line */}
              <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
                <span className="live-dot" />
                <span className="text-muted-foreground">23 people are browsing the shop right now</span>
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href="/quick-order">
                  <Button
                    size="lg"
                    data-testid="button-hero-quick-order"
                    className="btn-glow-accent gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Zap className="h-4 w-4" />
                    Order in 3 minutes
                  </Button>
                </Link>
                <Link href="/shop">
                  <Button size="lg" variant="outline" data-testid="button-hero-shop">
                    Browse the shop
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Loss aversion note */}
              <p className="mt-3 text-xs text-muted-foreground">
                💡 Brands ordering 100+ save an average of <strong className="text-foreground">₦14,000</strong> vs ordering in smaller batches.
              </p>

              {stats && (
                <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
                  <AnimatedStat value={`${stats.happyCustomers.toLocaleString()}+`} label="Customers" />
                  <AnimatedStat value={`${(stats.totalProducts * stats.totalCategories)}+`} label="Designs" />
                  <AnimatedStat value={`${stats.averageLeadTimeDays}d`} label="Lead time" />
                </dl>
              )}
            </div>
            <div className="relative">
              <StickerCollage />
            </div>
          </div>
        </div>
      </section>

      {/* SMART STOREFRONT — I HAVE A DESIGN */}
      <section className="border-y border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="urgency-badge">Fast lane</span>
                <span className="text-xs opacity-70">Used by 68% of our customers</span>
              </div>
              <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Already have a design?</h2>
              <p className="mt-3 text-base opacity-80">
                Upload your file, configure size, finish, and quantity — get a live price in seconds. Order placed in under 3 minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/quick-order">
                  <Button size="lg" variant="secondary" data-testid="button-i-have-design" className="gap-2 btn-glow-gold">
                    <Upload className="h-4 w-4" />
                    I have a design
                  </Button>
                </Link>
                <Link href="/generate">
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                    <Wand2 className="h-4 w-4" />
                    Generate with AI
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs opacity-60">Free AI mockup before you pay anything</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: Upload, label: "Upload", desc: "PNG, PDF, SVG, AI" },
                { icon: Zap, label: "Configure", desc: "Size · Finish · Qty" },
                { icon: MessageCircle, label: "Confirm & Pay", desc: "WhatsApp or Paystack" },
              ].map((s, i) => (
                <div key={s.label} className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                  <div className="grid h-10 w-10 mx-auto place-items-center rounded-xl bg-primary-foreground/20">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-xs font-semibold">{s.label}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{s.desc}</div>
                  {i < 2 ? <div className="mt-2 text-xs opacity-40">step {i + 1}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI CAPABILITIES STRIP */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            {[
              { icon: Mic, label: "Voice assistant", sub: "Talk to shop by voice", href: null },
              { icon: Sparkles, label: "AI chat", sub: "Instant quotes + recommendations", href: "/chat" },
              { icon: Wand2, label: "AI design", sub: "Generate sticker mockups", href: "/generate" },
              { icon: Layers, label: "Batch quotes", sub: "Compare 10 configs at once", href: "/batch" },
              { icon: BarChart2, label: "Live analytics", sub: "Studio dashboard", href: "/admin" },
            ].map((c) => {
              const inner = (
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 hover-elevate gradient-border">
                  <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs">{c.label}</div>
                    <div className="text-[11px] text-muted-foreground">{c.sub}</div>
                  </div>
                </div>
              );
              return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>;
            })}
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
          {(categories ?? []).map((cat, idx) => {
            const Icon = ICONS[cat.icon] ?? Sparkles;
            const isTrending = idx < 2;
            return (
              <Link
                key={cat.slug}
                href={`/shop?category=${cat.slug}`}
                className="group flex flex-col rounded-2xl border border-card-border bg-card p-5 hover-elevate gradient-border"
                data-testid={`card-category-${cat.slug}`}
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  {isTrending && <span className="badge-hot">🔥 Trending</span>}
                </div>
                <h3 className="mt-4 font-serif text-lg font-semibold">{cat.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                <div className="mt-3 text-xs text-muted-foreground">{cat.productCount} {cat.productCount === 1 ? "product" : "products"}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <div className="bg-muted/40 border-y border-border py-4">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-center">
            {[
              { stat: "1,200+", label: "happy customers" },
              { stat: "98%", label: "quality satisfaction" },
              { stat: "₦0", label: "cost to get a free AI mockup" },
              { stat: "3 days", label: "average turnaround" },
            ].map(({ stat, label }) => (
              <div key={label}>
                <div className="font-serif text-2xl font-bold text-shimmer">{stat}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[440px] rounded-2xl" />)
            : (featured ?? []).map((p, i) => <ProductCard key={p.slug} product={p} rotate={(i % 3 - 1) * 2} />)}
        </div>
        {/* Loss aversion */}
        <div className="mt-8 rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-5 flex items-start gap-4">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-semibold text-sm">Ordering fewer than 50 stickers?</div>
            <p className="text-sm text-muted-foreground mt-1">
              Customers who step up to 100 units save an average of <strong>₦12,000</strong> versus placing two smaller orders. Our bulk pricing is tiered — the more you print, the less each sticker costs.
            </p>
            <Link href="/batch">
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline cursor-pointer">
                Compare quantities → <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* RECENTLY VIEWED */}
      {recentProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-4 md:px-6 md:pb-6" data-testid="section-recently-viewed">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently viewed</div>
          <h2 className="mt-1 font-serif text-2xl font-semibold md:text-3xl">Pick up where you left off</h2>
          <p className="text-sm text-muted-foreground mt-1">Don't lose your place — these prices are live and may change with demand.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentProducts.slice(0, 4).map((p, i) => <ProductCard key={p.slug} product={p} rotate={(i % 2 === 0 ? -1 : 1) * 1.5} />)}
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</div>
          <h2 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">From idea to peel-and-stick</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              { icon: Upload, title: "1. Upload or generate", body: "Upload your design file — PNG, PDF, SVG, AI — or use our AI generator to create one from scratch. Free." },
              { icon: Zap, title: "2. Configure & price", body: "Pick size, finish, and quantity. Get a live price instantly. No waiting, no forms, no guesswork." },
              { icon: Scissors, title: "3. We print & cut", body: "Premium 3.2mil vinyl. Eco-solvent inks. Precision die-cutting on every order, in Lagos." },
              { icon: Truck, title: "4. Pickup or delivery", body: shop?.deliveryNote ?? "Free pickup in Lekki. Doorstep delivery quoted on WhatsApp." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-card-border bg-card p-6 gradient-border">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/quick-order">
              <Button size="lg" className="btn-glow-accent" data-testid="button-howitworks-cta">
                <Zap className="h-4 w-4" />
                Try the 3-minute order flow
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-2">No account needed · Free AI mockup · Pay only when you're ready</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technology</div>
        <h2 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">Shopping, reimagined</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Mic, title: "Voice Shopping", body: "Tap the mic and say what you need. Add items to cart, get prices, navigate — all by voice.", badge: "Try it" },
            { icon: Sparkles, title: "AI Sales Assistant", body: "Sticky, our AI bot, knows every product, price tier, and finish. Ask anything — it replies in seconds with a real quote.", badge: "Live" },
            { icon: Wand2, title: "AI Design Studio", body: "No design? No problem. Describe your sticker concept and our AI generates a print-ready mockup in under 30 seconds.", badge: "DALL-E 3" },
            { icon: Layers, title: "Batch Quote Engine", body: "Comparing 5 different sticker configs? Quote all of them in parallel with one click. Built for brands that order in volume.", badge: "Up to 10 rows" },
            { icon: Clock, title: "3-Minute Checkout", body: "Upload → configure → live quote → your details → confirmation. The entire purchase flow in under 3 minutes.", badge: "Quick Order" },
            { icon: BarChart2, title: "Studio Analytics", body: "Real-time order tracking, revenue charts, product popularity, and finish trends — all in one dashboard.", badge: "Admin" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-card-border bg-card p-5 gradient-border">
              <div className="flex items-start justify-between gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">{f.badge}</span>
              </div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
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
                  "AI voice & chat assistant for instant quotes on any size and finish.",
                  "Made in Lagos with 3-day turnaround and humans on WhatsApp.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {shop && (
                <a
                  href={whatsappUrl(shop.whatsappNumber, "Hi Sticker Lab! I'd like to ask about an order.")}
                  target="_blank" rel="noreferrer"
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover-elevate btn-glow-gold"
                  data-testid="link-whatsapp-why"
                >
                  <MessageCircle className="h-4 w-4" />
                  Talk to us on WhatsApp
                </a>
              )}
            </div>
            <div>
              <div className="rounded-3xl border border-card-border bg-card p-8 shadow-md gradient-border">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current text-yellow-400" />
                  ))}
                </div>
                <blockquote className="font-serif text-2xl leading-snug">
                  "Ordered 200 die-cut logos for our launch event. Showed up in 3 days,
                  and they've survived the rainy season on every laptop. Perfect."
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground font-semibold">A</div>
                  <div>
                    <div className="text-sm font-semibold">Ada O.</div>
                    <div className="text-xs text-muted-foreground">Founder · Lagos · Verified customer</div>
                  </div>
                </div>
              </div>

              {/* Stack more mini testimonials */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { name: "Emeka T.", role: "Creative Director", quote: "Best quality in Lagos, hands down." },
                  { name: "Fatima K.", role: "Brand Manager", quote: "The AI design tool saved us 2 hours." },
                ].map((t) => (
                  <div key={t.name} className="rounded-2xl border border-card-border bg-card p-4">
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current text-yellow-400" />)}
                    </div>
                    <p className="text-xs text-muted-foreground italic">"{t.quote}"</p>
                    <div className="mt-2 text-xs font-semibold">{t.name} <span className="font-normal text-muted-foreground">· {t.role}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA — FOMO CLOSER */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="live-dot" />
            <span className="text-sm opacity-80">23 people are placing orders right now</span>
          </div>
          <h2 className="font-serif text-3xl font-semibold md:text-5xl">
            Don't leave your sticker idea in a folder.
          </h2>
          <p className="mt-4 max-w-xl mx-auto opacity-80 text-base">
            Every day you wait is another day your brand isn't on laptops, water bottles, and packaging across Nigeria.
            Your competitors are already printing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/quick-order">
              <Button size="lg" variant="secondary" className="gap-2 btn-glow-gold text-lg px-8 py-4">
                <Zap className="h-5 w-5" />
                Start your order — 3 minutes
              </Button>
            </Link>
            <Link href="/generate">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                <Wand2 className="h-4 w-4" />
                Free AI mockup first
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs opacity-60">No credit card required to get a quote · Free AI design preview · Cancel anytime</p>
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
            top: it.top, left: it.left,
            width: it.size, height: it.size,
            transform: `rotate(${it.rot}deg)`,
            background: `radial-gradient(circle at 30% 30%, ${it.color1}, ${it.color1} 60%, ${it.color2})`,
            borderRadius: "9999px",
            display: "grid", placeItems: "center",
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
