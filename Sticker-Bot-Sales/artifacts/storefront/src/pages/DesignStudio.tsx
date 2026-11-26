import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/paths";
import { getToken, setAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MessageCircle, Save, Sparkles, Lock, Globe2, RotateCcw, Download, ChevronLeft, CheckCircle2 } from "lucide-react";

type Shape = "round" | "rectangle" | "oval";
type Template = {
  id: string;
  name: string;
  category: string;
  brand: string;
  product: string;
  tagline: string;
  color: string;
  accent: string;
  shape: Shape;
};

const TEMPLATES: Template[] = [
  { id: "spice", name: "Naija Spice", category: "Food & spices", brand: "MAMA'S KITCHEN", product: "JOLLOF SPICE", tagline: "Made with love • 100% natural", color: "#F7E7C6", accent: "#B83B25", shape: "round" },
  { id: "glow", name: "Glow Care", category: "Beauty & skincare", brand: "GLOW BY NENE", product: "BODY BUTTER", tagline: "Soft skin. Everyday glow.", color: "#F4DDE6", accent: "#7A3154", shape: "oval" },
  { id: "sip", name: "Fresh Sip", category: "Drinks", brand: "FRESH SIP", product: "Z O B O", tagline: "Natural • Chilled • Refreshing", color: "#F5E8C7", accent: "#7C3E24", shape: "rectangle" },
  { id: "honey", name: "Honey Gold", category: "Agriculture", brand: "GOLDEN HARVEST", product: "PURE HONEY", tagline: "100% natural • No additives", color: "#F8E7A8", accent: "#8B5A13", shape: "round" },
  { id: "bake", name: "Sweet Batch", category: "Bakery", brand: "SWEET BATCH", product: "FRESHLY BAKED", tagline: "A little joy in every bite", color: "#F4E1D1", accent: "#8D493B", shape: "rectangle" },
  { id: "custom", name: "Start blank", category: "Custom", brand: "YOUR BRAND", product: "YOUR PRODUCT", tagline: "Add your own details", color: "#F2F3F5", accent: "#243B53", shape: "round" },
];

const WHATSAPP_NUMBER = "2348058162036";
const DRAFT_KEY = "labelflow-design-draft-v1";

const COST_ANCHORS_BY_QUANTITY: Record<100 | 500 | 1000, Array<{ areaIn2: number; cost: number }>> = {
  100: [
    { areaIn2: 2.25, cost: 3000 },
    { areaIn2: 4, cost: 3000 },
    { areaIn2: 6.25, cost: 4500 },
    { areaIn2: 9, cost: 5000 },
    { areaIn2: 12, cost: 6500 },
    { areaIn2: 16, cost: 9000 },
  ],
  500: [
    { areaIn2: 2.25, cost: 12500 },
    { areaIn2: 4, cost: 12500 },
    { areaIn2: 6.25, cost: 20000 },
    { areaIn2: 9, cost: 22500 },
    { areaIn2: 12, cost: 30000 },
    { areaIn2: 16, cost: 42500 },
  ],
  1000: [
    { areaIn2: 2.25, cost: 20000 },
    { areaIn2: 4, cost: 20000 },
    { areaIn2: 6.25, cost: 35000 },
    { areaIn2: 9, cost: 40000 },
    { areaIn2: 12, cost: 55000 },
    { areaIn2: 16, cost: 80000 },
  ],
};

// The supplied cost sheet prices by the listed dimensions. For unlisted dimensions,
// estimate production cost by interpolating/extrapolating between its area anchors.
// This is an estimate only; material, shape, cutting and wastage can change the final quote.
function estimateProductionCost(areaIn2: number, qty: number): number | null {
  const anchors = COST_ANCHORS_BY_QUANTITY[qty as keyof typeof COST_ANCHORS_BY_QUANTITY];
  if (!anchors || !Number.isFinite(areaIn2) || areaIn2 <= 0) return null;

  let left = anchors[0];
  let right = anchors[1];

  if (areaIn2 <= anchors[0].areaIn2) {
    left = anchors[0];
    right = anchors[1];
  } else {
    for (let i = 1; i < anchors.length; i++) {
      if (areaIn2 <= anchors[i].areaIn2) {
        left = anchors[i - 1];
        right = anchors[i];
        break;
      }
      left = anchors[anchors.length - 2];
      right = anchors[anchors.length - 1];
    }
  }

  const ratio = (areaIn2 - left.areaIn2) / (right.areaIn2 - left.areaIn2);
  return Math.max(0, Math.ceil(left.cost + ratio * (right.cost - left.cost)));
}

function getRetailEstimate(widthMm: number, heightMm: number, qty: number) {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) ||
      widthMm < 20 || heightMm < 20 || widthMm > 300 || heightMm > 300) return null;
  const areaIn2 = (widthMm / 25.4) * (heightMm / 25.4);
  if (areaIn2 < 2.25 || areaIn2 > 16) return null;
  const cost = estimateProductionCost(areaIn2, qty);
  if (cost == null) return null;
  return Math.ceil((cost / 0.7) / 100) * 100;
}


function makeSvg(template: Template, width: number, height: number, preview = false) {
  const rx = template.shape === "round" ? Math.min(width, height) / 2 : template.shape === "oval" ? height / 2 : 34;
  const shape = template.shape === "round"
    ? `<circle cx="450" cy="450" r="405" fill="${template.color}" stroke="${template.accent}" stroke-width="14"/>`
    : `<rect x="48" y="90" width="804" height="720" rx="${rx}" fill="${template.color}" stroke="${template.accent}" stroke-width="14"/>`;
  const safe = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 900 900">
    <rect width="900" height="900" fill="#ffffff"/>
    ${shape}
    <circle cx="450" cy="250" r="64" fill="${template.accent}" opacity=".12"/>
    <text x="450" y="245" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" font-weight="700" letter-spacing="3" fill="${template.accent}">${safe(template.brand.slice(0, 28))}</text>
    <path d="M230 300 H670" stroke="${template.accent}" stroke-width="3" opacity=".4"/>
    <text x="450" y="425" text-anchor="middle" font-family="Arial,sans-serif" font-size="62" font-weight="800" fill="${template.accent}">${safe(template.product.slice(0, 22))}</text>
    <text x="450" y="490" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" fill="#30343b">${safe(template.tagline.slice(0, 48))}</text>
    <rect x="290" y="545" width="320" height="62" rx="31" fill="${template.accent}"/>
    <text x="450" y="585" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#ffffff">MADE IN NIGERIA</text>
    ${preview ? `<g opacity=".16" transform="rotate(-28 450 450)"><text x="450" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-size="74" font-weight="800" fill="#111111">DESIGN PREVIEW</text><text x="450" y="555" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#111111">NOT A PRINT FILE</text></g>` : ""}
  </svg>`;
}

export function GeneratePage() {
  const [templateId, setTemplateId] = useState("spice");
  const [brand, setBrand] = useState(TEMPLATES[0].brand);
  const [product, setProduct] = useState(TEMPLATES[0].product);
  const [tagline, setTagline] = useState(TEMPLATES[0].tagline);
  const [color, setColor] = useState(TEMPLATES[0].color);
  const [accent, setAccent] = useState(TEMPLATES[0].accent);
  const [shape, setShape] = useState<Shape>("round");
  const [width, setWidth] = useState("50");
  const [height, setHeight] = useState("50");
  const [quantity, setQuantity] = useState("100");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const design = useMemo<Template>(() => ({
    ...(TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]),
    brand, product, tagline, color, accent, shape,
  }), [templateId, brand, product, tagline, color, accent, shape]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft && typeof draft === "object") {
        setTemplateId(draft.templateId ?? "spice");
        setBrand(draft.brand ?? TEMPLATES[0].brand);
        setProduct(draft.product ?? TEMPLATES[0].product);
        setTagline(draft.tagline ?? TEMPLATES[0].tagline);
        setColor(draft.color ?? TEMPLATES[0].color);
        setAccent(draft.accent ?? TEMPLATES[0].accent);
        setShape(draft.shape ?? "round");
        setWidth(String(draft.width ?? 50));
        setHeight(String(draft.height ?? 50));
        setQuantity(String(draft.quantity ?? 100));
        setVisibility(draft.visibility === "public" ? "public" : "private");
      }
    } catch { /* Ignore an invalid local draft. */ }
  }, []);

  const selectTemplate = (t: Template) => {
    setTemplateId(t.id); setBrand(t.brand); setProduct(t.product); setTagline(t.tagline);
    setColor(t.color); setAccent(t.accent); setShape(t.shape); setSaved(false); setNotice("");
  };

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      templateId, brand, product, tagline, color, accent, shape, width, height, quantity, visibility,
    }));
    setSaved(true);
    setNotice("Design saved on this phone.");
  };

  const downloadPreview = async () => {
    const svg = makeSvg(design, Number(width) || 50, Number(height) || 50, true);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 900; canvas.height = 900;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 900);
      ctx.drawImage(image, 0, 0, 900, 900);
      canvas.toBlob((png) => {
        if (!png) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(png);
        link.download = "labelflow-design-preview.png";
        link.click();
        URL.revokeObjectURL(link.href);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    image.onerror = () => { URL.revokeObjectURL(url); setNotice("Could not prepare preview. Please try again."); };
    image.src = url;
  };

  const sendToWhatsApp = () => {
    const q = Math.max(20, Number(quantity) || 20);
    const message = [
      "Hello Sleekblue Media Houz! I created a product label with LabelFlow and would like a printing quote.",
      "",
      `Brand: ${brand}`,
      `Product: ${product}`,
      `Shape: ${shape}`,
      `Size: ${width}mm × ${height}mm`,
      `Quantity: ${q} pieces`,
      `Design visibility preference: ${visibility}`,
      "Please guide me on the next step for submitting the print-ready artwork and confirming the price.",
      "",
      "I understand the image preview is not the final production file.",
    ].join("\n");
    void downloadPreview();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setNotice("Your preview is downloading. Attach it to the WhatsApp message so our team can identify your design.");
  };

  const placeOrderAndPay = async () => {
    setNotice("");
    if (customerName.trim().length < 2 || customerPhone.replace(/\D/g, "").length < 10 || !customerEmail.trim()) {
      setNotice("Enter your name, a valid phone number and email to continue to secure payment.");
      return;
    }
    if (retailEstimate == null) {
      setNotice("This quantity or size needs a confirmed manual quote. Please use WhatsApp to request one.");
      return;
    }

    setCheckoutBusy(true);
    try {
      // Orders require an authenticated owner. Register this customer or sign in
      // an existing account before creating an order or starting payment.
      if (!getToken()) {
        if (customerPassword.length < 8) throw new Error("Create a password of at least 8 characters to secure your order.");
        const registration = await fetch(apiUrl("/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: customerName.trim(), email: customerEmail.trim(), phone: customerPhone.trim(), password: customerPassword }),
        });
        let account = await registration.json();
        if (!registration.ok && registration.status === 409) {
          const login = await fetch(apiUrl("/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: customerEmail.trim(), password: customerPassword }),
          });
          account = await login.json();
          if (!login.ok) throw new Error(account.error ?? "An account already exists. Check your password and try again.");
        } else if (!registration.ok) {
          throw new Error(account.error ?? "Could not create your customer account.");
        }
        setAuth(account.token, account.user);
      }
      const designNotes = JSON.stringify({
        templateId, brand, product, tagline, color, accent, shape,
        widthMm: Number(width), heightMm: Number(height), quantity: Number(quantity),
        visibilityPreference: visibility,
        artworkStatus: "Watermarked preview only; production artwork must be prepared and approved by Sleekblue.",
      });
      const orderResponse = await fetch(apiUrl("/orders"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          deliveryMethod: "Pickup",
          notes: `Label Studio design specification: ${designNotes}`,
          items: [{
            productName: "Custom product label",
            sizeLabel: `${width}mm × ${height}mm`,
            finishLabel: "To be confirmed by Sleekblue",
            quantity: Number(quantity),
            widthMm: Number(width),
            heightMm: Number(height),
            unitPrice: Math.ceil((retailEstimate / Number(quantity)) * 100) / 100,
            notes: `Brand: ${brand}; Product: ${product}; Shape: ${shape}`,
          }],
        }),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error ?? "Could not create your order.");

      const paymentResponse = await fetch(apiUrl("/payments/initialize"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok) {
        if (payment.whatsappFallbackUrl) {
          setNotice(`Order ${order.reference} was saved, but online payment could not start. You can continue with Sleekblue on WhatsApp.`);
          window.open(payment.whatsappFallbackUrl, "_blank", "noopener,noreferrer");
          return;
        }
        throw new Error(payment.error ?? "Could not initialize payment.");
      }
      try {
        sessionStorage.setItem("labelflow-pending-payment", JSON.stringify({
          reference: payment.reference,
          phone: customerPhone.trim(),
          orderReference: order.reference,
        }));
      } catch { /* Payment can still proceed if session storage is unavailable. */ }
      setNotice(`Order ${order.reference} created. Opening secure payment…`);
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setCheckoutBusy(false);
    }
  };

  const quantityNumber = Number(quantity) || 0;
  const retailEstimate = getRetailEstimate(Number(width), Number(height), quantityNumber);
  const isEligibleForFreeSample = quantityNumber >= 100;

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back home
      </Link>

      <header className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> FREE LABEL DESIGN STUDIO
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Make your product label.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Choose a ready-made design, change the words and colours, then send your preview to Sleekblue. No design skills needed.
          </p>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm">
          <div className="font-bold text-accent">New customer offer</div>
          <div className="mt-1 text-xl font-extrabold">10 stickers FREE</div>
          <div className="text-xs text-muted-foreground">On an approved first order. Terms apply.</div>
        </div>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_390px]">
        <section className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">1. Choose a design</h2>
              <span className="text-xs text-muted-foreground">Tap one to start</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => selectTemplate(t)}
                  className={`rounded-2xl border p-3 text-left transition ${templateId === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
                  <div className="mb-2 grid aspect-[4/3] place-items-center rounded-xl" style={{ background: t.color }}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 text-center text-[9px] font-black leading-tight" style={{ borderColor: t.accent, color: t.accent }}>
                      {t.product}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.category}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4 md:p-5">
            <h2 className="font-semibold">2. Put your business details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Business name
                <input value={brand} onChange={(e) => { setBrand(e.target.value); setSaved(false); }} maxLength={32} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Your business name"/>
              </label>
              <label className="text-sm font-medium">Product name
                <input value={product} onChange={(e) => { setProduct(e.target.value); setSaved(false); }} maxLength={24} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Your product name"/>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Short message
                <input value={tagline} onChange={(e) => { setTagline(e.target.value); setSaved(false); }} maxLength={48} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="E.g. Fresh, natural and handmade"/>
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Main colour
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                  <input aria-label="Main colour" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer border-0 bg-transparent"/>
                  <span className="text-xs text-muted-foreground">{color.toUpperCase()}</span>
                </div>
              </label>
              <label className="text-sm font-medium">Text colour
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                  <input aria-label="Text colour" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-12 cursor-pointer border-0 bg-transparent"/>
                  <span className="text-xs text-muted-foreground">{accent.toUpperCase()}</span>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4 md:p-5">
            <h2 className="font-semibold">3. Choose size and quantity</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-sm font-medium">Width (mm)
                <input type="number" min="20" max="300" value={width} onChange={(e) => setWidth(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/>
              </label>
              <label className="text-sm font-medium">Height (mm)
                <input type="number" min="20" max="300" value={height} onChange={(e) => setHeight(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/>
              </label>
              <label className="text-sm font-medium col-span-2">How many?
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3">
                  {["20","50","100","250","500","1000","2000","5000","10000","20000","50000","100000"].map((n) => <option key={n} value={n}>{Number(n).toLocaleString("en-NG")} pieces</option>)}
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Our standard order starts at 100 pieces. 20- and 50-piece requests are available for selected sizes and materials; we will confirm feasibility and price.</p>

            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="font-semibold">Estimated printing price</div>
              {retailEstimate != null ? (
                <>
                  <div className="mt-1 text-2xl font-extrabold">₦{retailEstimate.toLocaleString("en-NG")}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Estimate uses label area and the supplied Sleekblue cost-sheet anchors, with a 30% gross-margin target. Unlisted dimensions are estimates, not confirmed production prices. Delivery, packaging, payment fees, material, cutting and wastage may change the final quote.</p>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Automatic estimates cover supported sizes up to 16 sq in at 100, 500 or 1,000 pieces. Larger labels and other quantities need a factory-confirmed quote.</p>
              )}
            </div>
            <div className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">
              <div className="font-semibold">{isEligibleForFreeSample ? "You may qualify for 10 free sample stickers." : "Ask us about a small trial order."}</div>
              <div className="mt-1 text-xs text-muted-foreground">Final price depends on size, material, finish, quantity and cutting. We confirm your quote before printing.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4 md:p-5">
            <h2 className="font-semibold">4. Design visibility</h2>
            <p className="mt-1 text-xs text-muted-foreground">Choose whether you want your design considered for the public inspiration gallery.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setVisibility("private")} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${visibility === "private" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Lock className="h-4 w-4"/> Private
              </button>
              <button type="button" onClick={() => setVisibility("public")} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold ${visibility === "public" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Globe2 className="h-4 w-4"/> Public
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Your choice is saved with this phone's draft. Shared public-gallery publishing will be enabled when customer accounts and the shared design database are connected. Private is the default.</p>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Your label preview</h2>
              <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold">PREVIEW</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl bg-white p-3">
              <svg viewBox="0 0 900 900" className="w-full" role="img" aria-label="Your product label preview">
                {shape === "round" ? <circle cx="450" cy="450" r="405" fill={color} stroke={accent} strokeWidth="14"/> : <rect x="48" y="90" width="804" height="720" rx={shape === "oval" ? 360 : 34} fill={color} stroke={accent} strokeWidth="14"/>}
                <circle cx="450" cy="250" r="64" fill={accent} opacity=".12"/>
                <text x="450" y="245" textAnchor="middle" fontSize="26" fontWeight="700" letterSpacing="3" fill={accent}>{brand.slice(0,28)}</text>
                <path d="M230 300 H670" stroke={accent} strokeWidth="3" opacity=".4"/>
                <text x="450" y="425" textAnchor="middle" fontSize="62" fontWeight="800" fill={accent}>{product.slice(0,22)}</text>
                <text x="450" y="490" textAnchor="middle" fontSize="25" fill="#30343b">{tagline.slice(0,48)}</text>
                <rect x="290" y="545" width="320" height="62" rx="31" fill={accent}/>
                <text x="450" y="585" textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff">MADE IN NIGERIA</text>
                <g opacity=".17" transform="rotate(-28 450 450)"><text x="450" y="470" textAnchor="middle" fontSize="74" fontWeight="800" fill="#111">DESIGN PREVIEW</text></g>
              </svg>
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600"/>
              This is a low-resolution preview, not the final production artwork.
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={saveDraft} className="gap-2"><Save className="h-4 w-4"/> Save draft</Button>
              <Button variant="outline" onClick={() => { selectTemplate(TEMPLATES[0]); setNotice("Design reset."); }} className="gap-2"><RotateCcw className="h-4 w-4"/> Reset</Button>
            </div>
            <Button onClick={downloadPreview} variant="secondary" className="mt-2 w-full gap-2"><Download className="h-4 w-4"/> Download preview</Button>
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="font-semibold">5. Place your print order</h3>
              <p className="mt-1 text-xs text-muted-foreground">For now, online checkout supports 100, 500 or 1,000 pieces at supported sizes. Sleekblue confirms material, finish and production artwork before printing.</p>
              <div className="mt-3 space-y-2">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={100} placeholder="Your full name" autoComplete="name" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/>
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} maxLength={20} placeholder="WhatsApp phone number" autoComplete="tel" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/>
                <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} maxLength={254} type="email" placeholder="Email for payment receipt" autoComplete="email" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/>
                <input value={customerPassword} onChange={(e) => setCustomerPassword(e.target.value)} maxLength={128} minLength={8} type="password" placeholder="Create account password (8+ characters)" autoComplete="new-password" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated order total</span>
                <strong>{retailEstimate == null ? "Manual quote" : `₦${(retailEstimate).toLocaleString("en-NG")}`}</strong>
              </div>
              <Button onClick={placeOrderAndPay} disabled={checkoutBusy || retailEstimate == null} className="mt-3 w-full gap-2">
                {checkoutBusy ? "Preparing secure checkout…" : "Create order & pay securely"}
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">No print run begins until Sleekblue confirms the final production specifications. Your payment and order reference are handled separately.</p>
            </div>
            <Button onClick={sendToWhatsApp} className="mt-2 w-full gap-2"><MessageCircle className="h-4 w-4"/> Send to Sleekblue on WhatsApp</Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">WhatsApp: +234 805 816 2036</p>
            {notice && <p role="status" className="mt-3 rounded-lg bg-muted p-2 text-xs">{notice}</p>}
          </div>
          <div className="rounded-2xl border border-border p-4 text-sm">
            <div className="font-semibold">What happens next?</div>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs text-muted-foreground">
              <li>Send your design preview and order details.</li>
              <li>Our team checks the size, material and cutting.</li>
              <li>We confirm your price and delivery date.</li>
              <li>Sleekblue prepares the final print file and produces your stickers.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
