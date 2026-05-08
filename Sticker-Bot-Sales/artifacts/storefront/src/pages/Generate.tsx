import { useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cart } from "@/lib/cart";
import { apiUrl } from "@/lib/paths";
import {
  ChevronLeft,
  Download,
  Loader2,
  Sparkles,
  ShoppingBag,
  Wand2,
  ImageIcon,
} from "lucide-react";

const STYLES = [
  { value: "die-cut", label: "Die-Cut", desc: "Clean shape, white border" },
  { value: "holographic", label: "Holographic", desc: "Rainbow shimmer" },
  { value: "minimal", label: "Minimal", desc: "2-color, clean lines" },
  { value: "retro", label: "Retro", desc: "80s vibes, bold outlines" },
  { value: "bold", label: "Bold", desc: "High contrast, pop art" },
] as const;

type StyleValue = (typeof STYLES)[number]["value"];

const EXAMPLES = [
  "A roaring lion head with a crown, mascot logo style",
  "Cute kawaii avocado with sunglasses and a peace sign",
  "Lagos skyline silhouette with a sunset gradient",
  "Bold typographic 'No Wahala' in Yoruba-inspired lettering",
  "Geometric mandala flower with intricate petals",
];

export function GeneratePage() {
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<StyleValue>("die-cut");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imageUrl: string; prompt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const generate = async () => {
    const desc = description.trim();
    if (!desc || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAdded(false);
    try {
      const res = await fetch(apiUrl("/generate/sticker"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc, style }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!result) return;
    cart.add({
      productSlug: undefined,
      productName: `Custom AI Sticker — ${description.slice(0, 40)}`,
      imageUrl: result.imageUrl,
      sizeLabel: "Medium",
      finishLabel: style === "holographic" ? "Holographic" : style === "minimal" ? "Matte" : "Gloss",
      quantity: 50,
      widthMm: 75,
      heightMm: 75,
      unitPrice: 180,
    });
    setAdded(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back to shop
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill 4 · AI Image Orchestration</div>
            <h1 className="font-serif text-2xl font-semibold md:text-3xl">AI Sticker Generator</h1>
          </div>
        </div>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Describe your sticker concept and our AI will generate a high-quality mockup. Use it to visualize custom designs before ordering.
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Design concept</div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate();
              }}
              placeholder="Describe your sticker idea in detail…"
              rows={4}
              className="resize-none"
              data-testid="input-generate-desc"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setDescription(ex)}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover-elevate"
                >
                  {ex.slice(0, 32)}…
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-xs hover-elevate ${
                    style === s.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                  data-testid={`button-style-${s.value}`}
                >
                  <div className="font-semibold">{s.label}</div>
                  <div className={`mt-0.5 text-[11px] ${style === s.value ? "opacity-80" : "text-muted-foreground"}`}>
                    {s.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={generate}
            disabled={loading || !description.trim()}
            data-testid="button-generate"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate sticker
              </>
            )}
          </Button>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="aspect-square overflow-hidden rounded-3xl border border-card-border bg-card">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <Skeleton className="h-full w-full rounded-3xl absolute" />
                <div className="relative z-10 flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <div className="text-sm">Creating your sticker…</div>
                  <div className="text-xs">This may take 15–30 seconds</div>
                </div>
              </div>
            ) : result ? (
              <img
                ref={imgRef}
                src={result.imageUrl}
                alt="Generated sticker"
                className="h-full w-full object-cover"
                data-testid="generated-image"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30">
                  <ImageIcon className="h-8 w-8 opacity-40" />
                </div>
                <div className="text-center text-sm">
                  <div className="font-medium">Your design will appear here</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">Describe a concept and tap Generate</div>
                </div>
              </div>
            )}
          </div>

          {result ? (
            <div className="mt-4 flex flex-col gap-2">
              <Button
                className="w-full"
                size="lg"
                onClick={addToCart}
                disabled={added}
                data-testid="button-add-generated"
              >
                <ShoppingBag className="h-4 w-4" />
                {added ? "Added to cart!" : "Add to cart (50 stickers)"}
              </Button>
              <a
                href={result.imageUrl}
                download="sticker-design.png"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" className="w-full" size="lg">
                  <Download className="h-4 w-4" />
                  Download preview
                </Button>
              </a>
              {added ? (
                <Link href="/cart">
                  <Button variant="outline" className="w-full">View cart</Button>
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-card-border bg-card p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">How it works</div>
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          {[
            { n: "1", title: "Describe your idea", body: "Write a description of your sticker concept — the more detail the better." },
            { n: "2", title: "Pick a style", body: "Choose die-cut, holographic, minimal, retro, or bold to match your brand." },
            { n: "3", title: "Order & print", body: "Love the result? Add to cart and we'll print it on premium 3.2mil vinyl." },
          ].map((s) => (
            <div key={s.n} className="flex gap-3">
              <div className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {s.n}
              </div>
              <div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-muted-foreground mt-0.5">{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
