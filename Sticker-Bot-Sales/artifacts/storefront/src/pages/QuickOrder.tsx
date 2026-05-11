import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cart } from "@/lib/cart";
import { formatNGN } from "@/lib/format";
import { apiUrl } from "@/lib/paths";
import { useUpload } from "@/lib/upload";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileUp,
  Loader2,
  ShoppingBag,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useCreateOrder, useGetShopInfo } from "@workspace/api-client-react";

const PRODUCTS = [
  { slug: "die-cut-stickers", name: "Die-Cut", desc: "Any shape, sharp edges" },
  { slug: "circle-stickers", name: "Circle", desc: "Round, classic look" },
  { slug: "kiss-cut-stickers", name: "Kiss-Cut", desc: "Easy peel, sheet or singles" },
  { slug: "holographic-stickers", name: "Holographic", desc: "Rainbow shimmer" },
  { slug: "bumper-stickers", name: "Bumper", desc: "Elongated, car/laptop" },
  { slug: "sticker-sheets", name: "Sheet", desc: "Multiple designs on one sheet" },
];

const SIZES = [
  { label: "Small", desc: "50×50mm" },
  { label: "Medium", desc: "75×75mm" },
  { label: "Large", desc: "100×100mm" },
  { label: "Custom", desc: "Your dimensions" },
];

const FINISHES = [
  { label: "Matte", desc: "Soft, premium feel" },
  { label: "Gloss", desc: "Vibrant, reflective" },
  { label: "Holographic", desc: "Rainbow shimmer" },
];

const QTY_PRESETS = [50, 100, 250, 500, 1000];

type Step = "upload" | "configure" | "quote" | "checkout";

type QuoteResult = {
  unitPrice: number;
  total: number;
  subtotal: number;
  savingsNote?: string;
  leadTimeDays: number;
  breakdown: { label: string; amount: number }[];
};

export function QuickOrderPage() {
  const [, navigate] = useLocation();
  const { data: shop } = useGetShopInfo();
  const { uploadFile, isUploading, error: uploadErr, setError: setUploadErr } = useUpload();

  const [step, setStep] = useState<Step>("upload");
  const [artworks, setArtworks] = useState<{ name: string; objectPath: string; preview?: string }[]>([]);
  const [hasDesign, setHasDesign] = useState<boolean | null>(null);
  const [aiDescription, setAiDescription] = useState("");

  const [productSlug, setProductSlug] = useState("die-cut-stickers");
  const [sizeLabel, setSizeLabel] = useState("Medium");
  const [finishLabel, setFinishLabel] = useState("Matte");
  const [quantity, setQuantity] = useState(100);
  const [customW, setCustomW] = useState(70);
  const [customH, setCustomH] = useState(70);

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const dropRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        cart.clear();
        navigate(`/orders/${order.id}?ref=${encodeURIComponent(order.reference)}`);
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Could not place order.";
        setSubmitErr(msg);
      },
    },
  });

  const fetchQuote = async () => {
    setQuoting(true);
    try {
      const res = await fetch(apiUrl("/pricing/quote"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          sizeLabel,
          finishLabel,
          quantity,
          ...(sizeLabel === "Custom" ? { widthMm: customW, heightMm: customH } : {}),
        }),
      });
      const data = await res.json();
      setQuote(data);
    } finally {
      setQuoting(false);
    }
  };

  useEffect(() => {
    if (step === "quote" || step === "checkout") fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, productSlug, sizeLabel, finishLabel, quantity, customW, customH]);

  const handleFileDrop = async (files: FileList | File[]) => {
    setUploadErr(null);
    for (const file of Array.from(files)) {
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      const res = await uploadFile(file);
      if (res) {
        setArtworks((prev) => [...prev, { name: res.name, objectPath: res.objectPath, preview }]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFileDrop(e.dataTransfer.files);
  };

  const placeOrder = () => {
    if (!quote || !name.trim() || !phone.trim()) return;
    const product = PRODUCTS.find((p) => p.slug === productSlug);
    createOrder.mutate({
      data: {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        deliveryMethod: "Pickup",
        notes: [notes.trim(), aiDescription.trim()].filter(Boolean).join("\n") || undefined,
        artworkUrls: artworks.length ? artworks.map((a) => a.objectPath) : undefined,
        items: [{
          productSlug,
          productName: product?.name ?? productSlug,
          sizeLabel,
          finishLabel,
          quantity,
          widthMm: sizeLabel === "Custom" ? customW : undefined,
          heightMm: sizeLabel === "Custom" ? customH : undefined,
          unitPrice: quote.unitPrice,
        }],
      },
    });
  };

  const STEPS: { id: Step; label: string }[] = [
    { id: "upload", label: "Design" },
    { id: "configure", label: "Configure" },
    { id: "quote", label: "Quote" },
    { id: "checkout", label: "Order" },
  ];
  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <header className="mt-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Order — under 3 minutes</div>
            <h1 className="font-serif text-2xl font-semibold">Order your stickers</h1>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => { if (i < stepIdx) setStep(s.id); }}
                disabled={i > stepIdx}
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  s.id === step ? "text-primary" : i < stepIdx ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/40"
                }`}
              >
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                  s.id === step ? "bg-primary text-primary-foreground" : i < stepIdx ? "bg-muted text-foreground" : "bg-muted/40 text-muted-foreground/40"
                }`}>
                  {i < stepIdx ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 ? (
                <div className={`flex-1 mx-2 h-px ${i < stepIdx ? "bg-primary" : "bg-border"}`} />
              ) : null}
            </div>
          ))}
        </div>
      </header>

      <div className="mt-8">
        {step === "upload" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-sm font-semibold text-muted-foreground">Do you have a design file ready?</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHasDesign(true)}
                className={`rounded-2xl border-2 p-5 text-left hover-elevate ${hasDesign === true ? "border-primary bg-primary/5" : "border-border"}`}
                data-testid="button-has-design-yes"
              >
                <Upload className="h-6 w-6 text-primary mb-2" />
                <div className="font-semibold">Yes, I have a file</div>
                <div className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF, SVG, AI</div>
              </button>
              <button
                type="button"
                onClick={() => setHasDesign(false)}
                className={`rounded-2xl border-2 p-5 text-left hover-elevate ${hasDesign === false ? "border-primary bg-primary/5" : "border-border"}`}
                data-testid="button-has-design-no"
              >
                <Sparkles className="h-6 w-6 text-accent mb-2" />
                <div className="font-semibold">I need help with a design</div>
                <div className="text-xs text-muted-foreground mt-1">Describe your idea</div>
              </button>
            </div>

            {hasDesign === true && (
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border bg-background/40"}`}
                data-testid="dropzone"
              >
                <FileUp className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <div className="text-sm font-semibold">Drop your design files here</div>
                <div className="text-xs text-muted-foreground mt-1">or click to browse</div>
                <label className="mt-4 inline-block cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-sm hover-elevate">
                  Browse files
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,application/pdf,.ai,.svg,.eps"
                    disabled={isUploading}
                    onChange={(e) => { if (e.target.files) handleFileDrop(e.target.files); e.target.value = ""; }}
                  />
                </label>
                {isUploading ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </div>
                ) : null}
                {uploadErr ? <div className="mt-2 text-xs text-destructive">{uploadErr}</div> : null}
                {artworks.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-left">
                    {artworks.map((a, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
                        {a.preview ? (
                          <img src={a.preview} alt={a.name} className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-muted">
                            <FileUp className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="flex-1 min-w-0 text-sm truncate">{a.name}</span>
                        <button type="button" onClick={() => setArtworks((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover-elevate">
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}

            {hasDesign === false && (
              <div className="space-y-3">
                <Textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="Describe your sticker idea — style, colors, shapes, logo, text…"
                  rows={4}
                  data-testid="input-design-desc"
                />
                <div className="flex gap-2">
                  <Link href="/generate" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Sparkles className="h-4 w-4" /> Generate with AI
                    </Button>
                  </Link>
                  <Link href="/chat" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <MessageCircle className="h-4 w-4" /> Chat with AI
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => setStep("configure")}
              disabled={hasDesign === null || (hasDesign && artworks.length === 0 && !isUploading) || isUploading}
              data-testid="button-next-configure"
            >
              Next: Configure your order
              <ArrowRight className="h-4 w-4" />
            </Button>
            {hasDesign === null ? null : (
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground hover:underline"
                onClick={() => setStep("configure")}
              >
                {hasDesign ? "Skip — upload later on WhatsApp" : "Continue without design →"}
              </button>
            )}
          </div>
        )}

        {step === "configure" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Section title="Sticker type">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRODUCTS.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setProductSlug(p.slug)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm hover-elevate ${productSlug === p.slug ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                    data-testid={`button-product-${p.slug}`}
                  >
                    <div className={`font-semibold ${productSlug === p.slug ? "text-primary" : ""}`}>{p.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Size">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SIZES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setSizeLabel(s.label)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm hover-elevate ${sizeLabel === s.label ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                    data-testid={`button-size-${s.label}`}
                  >
                    <div className={`font-semibold text-sm ${sizeLabel === s.label ? "text-primary" : ""}`}>{s.label}</div>
                    <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                  </button>
                ))}
              </div>
              {sizeLabel === "Custom" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs">
                    Width (mm)
                    <input type="number" min={20} max={300} value={customW} onChange={(e) => setCustomW(Number(e.target.value) || 70)}
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    Height (mm)
                    <input type="number" min={20} max={300} value={customH} onChange={(e) => setCustomH(Number(e.target.value) || 70)}
                      className="rounded-lg border border-input bg-card px-3 py-2 text-sm" />
                  </label>
                </div>
              )}
            </Section>

            <Section title="Finish">
              <div className="grid grid-cols-3 gap-2">
                {FINISHES.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setFinishLabel(f.label)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm hover-elevate ${finishLabel === f.label ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                    data-testid={`button-finish-${f.label}`}
                  >
                    <div className={`font-semibold ${finishLabel === f.label ? "text-primary" : ""}`}>{f.label}</div>
                    <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Quantity">
              <div className="flex flex-wrap gap-2">
                {QTY_PRESETS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium hover-elevate ${quantity === q ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={5000}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="mt-2 w-32 rounded-lg border border-input bg-card px-3 py-2 text-sm"
                placeholder="Custom qty"
              />
            </Section>

            <Button className="w-full" size="lg" onClick={() => setStep("quote")} data-testid="button-next-quote">
              See live price <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "quote" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-card-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your live quote</div>
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              {quoting ? (
                <Skeleton className="h-24 rounded-xl" />
              ) : quote ? (
                <div>
                  <div className="flex items-baseline justify-between">
                    <div className="font-serif text-4xl font-semibold">{formatNGN(quote.total)}</div>
                    <div className="text-sm text-muted-foreground">{formatNGN(quote.unitPrice)} / sticker</div>
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
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                      {quote.savingsNote}
                    </div>
                  ) : null}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Lead time: {quote.leadTimeDays} business days · {quantity} stickers
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Calculating…</div>
              )}
            </div>

            <div className="rounded-2xl border border-card-border bg-muted/30 p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{PRODUCTS.find((p) => p.slug === productSlug)?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-medium">{sizeLabel}{sizeLabel === "Custom" ? ` (${customW}×${customH}mm)` : ""}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Finish</span><span className="font-medium">{finishLabel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span className="font-medium">{quantity.toLocaleString()}</span></div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("configure")} className="flex-1">Edit config</Button>
              <Button className="flex-1" size="lg" onClick={() => setStep("checkout")} disabled={!quote} data-testid="button-next-checkout">
                Order now <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "checkout" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-card-border bg-card p-4 text-sm space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Order summary</div>
              <div className="flex justify-between"><span className="text-muted-foreground">{PRODUCTS.find((p) => p.slug === productSlug)?.name} — {quantity} × {sizeLabel} {finishLabel}</span><span className="font-semibold">{quote ? formatNGN(quote.total) : "—"}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>Quoted on WhatsApp</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Your name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okoye" className="mt-1" data-testid="input-name-quick" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">WhatsApp number *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="mt-1" data-testid="input-phone-quick" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Brand colors, deadline, any special requirements…" rows={2} className="mt-1" />
              </div>
            </div>

            {submitErr ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitErr}</div>
            ) : null}

            <Button
              className="w-full"
              size="lg"
              onClick={placeOrder}
              disabled={!quote || !name.trim() || phone.trim().length < 6 || createOrder.isPending}
              data-testid="button-place-quick-order"
            >
              <ShoppingBag className="h-4 w-4" />
              {createOrder.isPending ? "Placing order…" : "Place order & open WhatsApp"}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              We'll confirm your design, delivery, and total on WhatsApp ({shop?.whatsappDisplay ?? "+234…"})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function MessageCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
