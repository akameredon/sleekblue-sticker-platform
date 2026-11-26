import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/paths";
import { getToken, setAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MessageCircle, Save, Sparkles, Lock, Globe2, RotateCcw, Download, ChevronLeft, CheckCircle2 } from "lucide-react";

type Shape = "round" | "square" | "rectangle" | "oval" | "custom";
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
  direction: string;
};

const TEMPLATES: Template[] = [
  { id: "botanical-jar", name: "Botanical minimal", category: "Food & natural products", brand: "", product: "", tagline: "", color: "#E7DDC9", accent: "#3D5142", shape: "round", direction: "Minimal botanical composition, elegant leaf line art, warm cream background, deep forest-green typography and generous whitespace." },
  { id: "bold-colour", name: "Bold colour block", category: "Food & beverages", brand: "", product: "", tagline: "", color: "#DDE6F4", accent: "#243B68", shape: "square", direction: "Bold geometric colour blocking, high contrast, confident sans-serif typography and a strong central product name." },
  { id: "floral-skincare", name: "Soft floral", category: "Beauty & personal care", brand: "", product: "", tagline: "", color: "#E9D9D5", accent: "#79594F", shape: "round", direction: "Delicate botanical line illustrations, muted blush palette, refined serif typography and balanced negative space." },
  { id: "artisan-heritage", name: "Artisan heritage", category: "Food & handmade goods", brand: "", product: "", tagline: "", color: "#E8D9C7", accent: "#694B3A", shape: "rectangle", direction: "Warm artisan identity, restrained ornamental border, earthy colours, heritage-inspired typography and clear information hierarchy." },
  { id: "modern-monochrome", name: "Modern monochrome", category: "Beauty & premium goods", brand: "", product: "", tagline: "", color: "#F1EDE5", accent: "#242424", shape: "rectangle", direction: "Minimal monochrome layout, strong typographic hierarchy, fine rules, precise alignment and generous white space." },
  { id: "citrus-fresh", name: "Citrus fresh", category: "Drinks & food", brand: "", product: "", tagline: "", color: "#F7E8A8", accent: "#315B42", shape: "round", direction: "Fresh citrus-inspired palette, simple fruit slice illustrations, lively but legible typography and energetic composition." },
  { id: "luxury-gold", name: "Luxury gold", category: "Beauty & gifts", brand: "", product: "", tagline: "", color: "#F2E8D2", accent: "#725522", shape: "oval", direction: "Elegant luxury label, fine gold-toned ornamental lines, sophisticated serif typography and restrained premium spacing." },
  { id: "playful-kids", name: "Playful colour", category: "Kids & family products", brand: "", product: "", tagline: "", color: "#F9D5D8", accent: "#7B3D70", shape: "square", direction: "Friendly playful shapes, cheerful balanced colours, rounded typography and a clear readable product title." },
  { id: "afro-modern", name: "Afro-modern pattern", category: "Food, fashion & culture", brand: "", product: "", tagline: "", color: "#F0D6A7", accent: "#713B2C", shape: "round", direction: "Original contemporary African-inspired geometric pattern, warm earth palette, modern bold typography and uncluttered layout." },
  { id: "organic-earth", name: "Organic earth", category: "Natural & wellness products", brand: "", product: "", tagline: "", color: "#DCE4D9", accent: "#355447", shape: "rectangle", direction: "Organic natural palette, delicate leaf and seed illustrations, calm typography and clean editorial spacing." },
  { id: "premium-black", name: "Premium dark", category: "Fragrance & premium goods", brand: "", product: "", tagline: "", color: "#252525", accent: "#E9D8AC", shape: "rectangle", direction: "Deep charcoal field, warm ivory and muted gold typography, minimal fine-line details and premium contrast." },
  { id: "watercolour", name: "Watercolour softness", category: "Beauty & handmade goods", brand: "", product: "", tagline: "", color: "#E7E3F2", accent: "#55486F", shape: "oval", direction: "Soft watercolour-inspired abstract botanical accents, gentle lavender palette and graceful readable typography." },
  { id: "tech-clean", name: "Clean technology", category: "Electronics & technology", brand: "", product: "", tagline: "", color: "#E3EDF2", accent: "#214A60", shape: "square", direction: "Precise grid, crisp technical sans-serif typography, subtle line icons and cool clean colours." },
  { id: "farm-fresh", name: "Farm fresh", category: "Agriculture & food", brand: "", product: "", tagline: "", color: "#E6E3C8", accent: "#465A32", shape: "rectangle", direction: "Farm-fresh visual language, original crop and leaf illustrations, natural green palette and highly readable product information." },
  { id: "elegant-script", name: "Elegant script", category: "Events & gifts", brand: "", product: "", tagline: "", color: "#F2E1E4", accent: "#805766", shape: "oval", direction: "Graceful script accent paired with readable serif typography, delicate divider lines and a soft romantic palette." },
  { id: "street-bold", name: "Street bold", category: "Fashion & lifestyle", brand: "", product: "", tagline: "", color: "#F4D84A", accent: "#202020", shape: "square", direction: "High-energy graphic composition, oversized bold lettering, sharp geometric accents and strong black-yellow contrast." },
  { id: "clean-medical", name: "Clean care", category: "Health & personal care", brand: "", product: "", tagline: "", color: "#E4F0EB", accent: "#285D50", shape: "rectangle", direction: "Calm clinical clarity, simple iconography, structured information zones and reassuring green-white palette." },
  { id: "coffee-craft", name: "Coffee craft", category: "Coffee & beverages", brand: "", product: "", tagline: "", color: "#E6D3BD", accent: "#563A2C", shape: "round", direction: "Craft coffee identity, original coffee botanical line art, rich roasted-brown palette and confident editorial typography." },
  { id: "minimal-grid", name: "Minimal grid", category: "Business & retail", brand: "", product: "", tagline: "", color: "#F4F2EC", accent: "#343C45", shape: "rectangle", direction: "Swiss-inspired grid, strong alignment, restrained colour palette, clean sans-serif typography and ample breathing room." },
  { id: "celebration", name: "Celebration", category: "Events & party favours", brand: "", product: "", tagline: "", color: "#F5D9B8", accent: "#8A4B36", shape: "round", direction: "Joyful celebratory composition, tasteful confetti geometry, warm festive colours and clear central typography." },
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
  const safe = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
  const shape = template.shape === "round"
    ? '<circle cx="450" cy="450" r="410"'
    : template.shape === "oval"
      ? '<ellipse cx="450" cy="450" rx="410" ry="350"'
      : `<rect x="35" y="35" width="830" height="830" rx="${template.shape === "square" ? 24 : 54}"`;
  const motif = `<path d="M150 700 L750 700 M150 730 L750 730" stroke="${template.accent}" stroke-width="5" opacity=".22"/><circle cx="170" cy="170" r="18" fill="${template.accent}" opacity=".18"/><circle cx="730" cy="730" r="18" fill="${template.accent}" opacity=".18"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 900 900" role="img" aria-label="Flat sticker artwork preview">
    <rect width="900" height="900" fill="#ffffff"/>
    <g>${shape} fill="${template.color}" stroke="${template.accent}" stroke-width="8"/></g>
    <g>${motif}</g>
    <rect x="135" y="135" width="630" height="630" rx="24" fill="none" stroke="${template.accent}" stroke-width="3" opacity=".35"/>
    <text x="450" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" letter-spacing="3" fill="${template.accent}">${safe(template.brand.slice(0, 28) || "YOUR BRAND")}</text>
    <path d="M260 340 H640" stroke="${template.accent}" stroke-width="3" opacity=".5"/>
    <text x="450" y="470" text-anchor="middle" font-family="Georgia,serif" font-size="58" font-weight="700" fill="${template.accent}">${safe(template.product.slice(0, 22) || "PRODUCT NAME")}</text>
    <text x="450" y="535" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="${template.accent}">${safe(template.tagline.slice(0, 48) || "YOUR MESSAGE")}</text>
    ${preview ? '<text x="450" y="680" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" letter-spacing="2" fill="#555555">FLAT ARTWORK PREVIEW</text>' : ""}
  </svg>`;
}
export function GeneratePage() {
  const [templateId, setTemplateId] = useState("botanical-jar");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [tagline, setTagline] = useState("");
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
  const [creativeBrief, setCreativeBrief] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [printPhone, setPrintPhone] = useState("");
  const [printSocials, setPrintSocials] = useState("");
  const [printWebsite, setPrintWebsite] = useState("");
  const [includePrintPhone, setIncludePrintPhone] = useState(false);
  const [includePrintSocials, setIncludePrintSocials] = useState(false);
  const [includePrintWebsite, setIncludePrintWebsite] = useState(false);
  const [includeTagline, setIncludeTagline] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

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
        setTemplateId(TEMPLATES.some((item) => item.id === draft.templateId) ? draft.templateId : "botanical-jar");
        setBrand(draft.brand ?? "");
        setProduct(draft.product ?? "");
        setTagline(draft.tagline ?? "");
        setPrintPhone(draft.printPhone ?? "");
        setPrintSocials(draft.printSocials ?? "");
        setPrintWebsite(draft.printWebsite ?? "");
        setIncludePrintPhone(Boolean(draft.includePrintPhone));
        setIncludePrintSocials(Boolean(draft.includePrintSocials));
        setIncludePrintWebsite(Boolean(draft.includePrintWebsite));
        setIncludeTagline(Boolean(draft.includeTagline));
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
    setTemplateId(t.id);
    setColor(t.color); setAccent(t.accent); setShape(t.shape); setSaved(false); setNotice("");
  };

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      templateId, brand, product, tagline, printPhone, printSocials, printWebsite, includePrintPhone, includePrintSocials, includePrintWebsite, includeTagline, color, accent, shape, width, height, quantity, visibility,
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

  const buildChatGPTPrompt = () => {
    const selected = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
    const details = [
      ["Business / brand", brand], ["Product", product],
      ["Printed phone", includePrintPhone ? printPhone : ""], ["Printed social handle", includePrintSocials ? printSocials : ""],
      ["Printed website", includePrintWebsite ? printWebsite : ""], ["Tagline", includeTagline ? tagline : ""],
      ["Logo file supplied separately", logoFile?.name ?? ""],
      ["Label shape", shape], ["Finished size", `${width} mm × ${height} mm`],
      ["Quantity", quantity], ["Colour preference", `${color} background, ${accent} text/accent`],
      ["Selected gallery reference", selected.name], ["Visual direction", selected.direction],
      ["Customer's extra instructions", creativeBrief],
    ].filter(([, value]) => String(value ?? "").trim()).map(([key, value]) => `${key}: ${value}`);
    return [
      "Create THREE distinct, original sticker artwork concepts from the customer details and selected visual direction. Present them as three separate flat artwork outputs, not a collage.",
      "Ask only for missing essentials, one concise question at a time: business/brand name and product name. If printed phone, social handle, website or tagline fields are blank, ask briefly whether the customer wants any of them printed. Never invent names, contact details, ingredients, claims or certifications.",
      "If information is already supplied, do not ask again. Offer short numbered choices only for unresolved decisions. The customer may say 'choose for me'.",
      "Only include optional phone, social handle, website and tagline text if the customer has explicitly selected its print checkbox. If a logo file is supplied, use it exactly as provided; do not redraw, distort or recolour it. The customer must attach the logo file in the external AI tool alongside this prompt."
      "Use the selected style direction as inspiration, creating original artwork rather than copying any Pinterest reference. Preserve the confirmed shape and exact physical proportions. Keep all text readable and inside a safe margin. No filler text, emojis, random icons, fake badges or unsupported claims.",
      "Show only flat, front-facing sticker artwork on a plain neutral background. Never show bottles, jars, cups, boxes, packaging, products, hands, scenes or lifestyle mockups. Show the complete sticker, undistorted. Use only confirmed customer details.",
      "", "CUSTOMER PROJECT", ...details,
      `Selected visual style: ${selected.name}`,
      `Style direction: ${selected.direction}`,
      "", "If the business or product name is missing, begin by asking for the business/brand name."
    ].join("\n");
  };

  const copyFullDesignPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildChatGPTPrompt());
      setNotice("Full design prompt copied. Return to ChatGPT, paste it into the message box and press Send.");
    } catch {
      setNotice("Your browser blocked clipboard access. Use the Open ChatGPT Designer button to try the prepared prompt link.");
    }
  };

  const openChatGPTDesigner = () => {
    const prompt = buildChatGPTPrompt();
    try { sessionStorage.setItem("labelflow-chatgpt-prompt", prompt); } catch { /* Clipboard and URL handoff remain available. */ }
    // Copy the complete brief as a fallback in case ChatGPT's undocumented URL
    // prefill truncates a long prompt or the customer is not signed in.
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(prompt).catch(() => {
        setNotice("ChatGPT is opening. If the brief is not already in the message box, return here and use Copy full prompt.");
      });
    }
    window.open(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`, "_blank", "noopener,noreferrer");
    setNotice("Your full design brief has been copied and ChatGPT is opening. Check that the complete brief appears, then press Send. If it is missing or shortened, return here and use Copy full prompt. Download the generated artwork and upload it here.");
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
    if (!brand.trim() || !product.trim()) {
      setNotice("Business/brand name and product name are required before checkout.");
      return;
    }
    if (!artworkFile) {
      setNotice("Download your generated design from ChatGPT and select the artwork file here before checkout.");
      return;
    }
    const allowedArtworkTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);
    if (artworkFile.size > 20 * 1024 * 1024 || !allowedArtworkTypes.has(artworkFile.type.toLowerCase())) {
      setNotice("Choose a PNG, JPG/JPEG or PDF artwork file up to 20 MB.");
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
      // Upload the customer's ChatGPT-generated artwork directly to private object storage.
      const uploadRequest = await fetch(apiUrl("/storage/uploads/request-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: artworkFile.name, size: artworkFile.size, contentType: artworkFile.type }),
      });
      const uploadDetails = await uploadRequest.json();
      if (!uploadRequest.ok) throw new Error(uploadDetails.error ?? "Could not prepare your private artwork upload.");

      const fileUpload = await fetch(uploadDetails.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": artworkFile.type },
        body: artworkFile,
      });
      if (!fileUpload.ok) throw new Error("Your artwork could not be uploaded. Please try again.");

      const uploadComplete = await fetch(apiUrl("/storage/uploads/complete"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ objectPath: uploadDetails.objectPath }),
      });
      const securedArtwork = await uploadComplete.json();
      if (!uploadComplete.ok) throw new Error(securedArtwork.error ?? "Your artwork upload could not be secured.");
      const artworkObjectPath = securedArtwork.objectPath ?? uploadDetails.objectPath;

      const designNotes = JSON.stringify({
        templateId, brand, product, tagline, printPhone: includePrintPhone ? printPhone : "", printSocials: includePrintSocials ? printSocials : "", printWebsite: includePrintWebsite ? printWebsite : "", includeTagline, includePrintPhone, includePrintSocials, includePrintWebsite, logoFilename: logoFile?.name ?? null, color, accent, shape,
        widthMm: Number(width), heightMm: Number(height), quantity: Number(quantity),
        visibilityPreference: visibility,
        artworkObjectPath,
        artworkFilename: artworkFile.name,
        artworkStatus: "Customer-generated artwork uploaded privately; production file requires Sleekblue review and approval.",
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
            notes: `Brand: ${brand}; Product: ${product}; Shape: ${shape}; Artwork: ${artworkObjectPath}`,
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
            <Sparkles className="h-3.5 w-3.5" /> STICKER DESIGN STUDIO
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Make your product label.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Choose a sticker style, enter your business details, prepare your design prompt and upload the finished artwork for Sleekblue to review.
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">1. Choose a visual reference</h2>
                <p className="mt-1 text-xs text-muted-foreground">Select a flat sticker style. Your prompt uses its visual direction to create original artwork.</p>
              </div>
              <a href="https://www.pinterest.com/search/pins/?q=product%20label%20sticker%20design" target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-primary underline">Pinterest ideas</a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATES.map((t) => (
                <div key={t.id} className={`overflow-hidden rounded-2xl border bg-card transition ${templateId === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
                  <button type="button" onClick={() => selectTemplate(t)} className="block w-full text-left">
                    <div className="aspect-[4/3] w-full overflow-hidden bg-white p-2" dangerouslySetInnerHTML={{ __html: makeSvg({ ...t, brand: "", product: "", tagline: "" }, 80, 60, false) }}/>
                    <div className="p-3">
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.category}</div>
                      <div className="mt-2 text-xs font-semibold text-primary">{templateId === t.id ? "Selected style" : "Use this style"}</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4 md:p-5">
            <h2 className="font-semibold">2. Enter your business details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Business / brand name <span className="text-destructive">*</span>
                <input required value={brand} onChange={(e) => { setBrand(e.target.value); setSaved(false); }} maxLength={32} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Your business name"/>
              </label>
              <label className="text-sm font-medium">Product name <span className="text-destructive">*</span>
                <input required value={product} onChange={(e) => { setProduct(e.target.value); setSaved(false); }} maxLength={24} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Your product name"/>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Short message
                <input value={tagline} onChange={(e) => { setTagline(e.target.value); setSaved(false); }} maxLength={48} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Optional short message"/>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Phone / contact (optional)
                <input value={printPhone} onChange={(e) => setPrintPhone(e.target.value)} maxLength={40} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Your business phone"/>
                <span className="mt-1 flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={includePrintPhone} onChange={(e) => setIncludePrintPhone(e.target.checked)} disabled={!printPhone.trim()}/> Print this phone number on my sticker</span>
              </label>
              <label className="text-sm font-medium">Social handle (optional)
                <input value={printSocials} onChange={(e) => setPrintSocials(e.target.value)} maxLength={60} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="@yourbusiness"/>
                <span className="mt-1 flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={includePrintSocials} onChange={(e) => setIncludePrintSocials(e.target.checked)} disabled={!printSocials.trim()}/> Print this handle</span>
              </label>
              <label className="text-sm font-medium">Website (optional)
                <input value={printWebsite} onChange={(e) => setPrintWebsite(e.target.value)} maxLength={100} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="www.yourbusiness.com"/>
                <span className="mt-1 flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={includePrintWebsite} onChange={(e) => setIncludePrintWebsite(e.target.checked)} disabled={!printWebsite.trim()}/> Print this website</span>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Business logo (optional)
                <input type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-xs"/>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">{logoFile ? "Logo selected. Attach it separately when using the external AI designer." : "You can supply a logo and ask the external designer to use it unchanged."}</span>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={includeTagline} onChange={(e) => setIncludeTagline(e.target.checked)} disabled={!tagline.trim()}/> Print my short message on the sticker</label>
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

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <h3 className="font-semibold">Review your label details</h3>
            <p className="mt-2 text-muted-foreground">Brand: <strong className="text-foreground">{brand.trim() || "Required — add your business name"}</strong></p>
            <p className="text-muted-foreground">Product: <strong className="text-foreground">{product.trim() || "Required — add your product name"}</strong></p>
            <p className="text-muted-foreground">Printed contact details: <strong className="text-foreground">{[includePrintPhone && printPhone, includePrintSocials && printSocials, includePrintWebsite && printWebsite, includeTagline && tagline].filter(Boolean).join(" · ") || "None selected"}</strong></p>
            <p className="text-muted-foreground">Logo: <strong className="text-foreground">{logoFile ? "Supplied separately for the external design tool" : "Not supplied"}</strong></p>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-accent/10 p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/><h2 className="font-semibold">Generate your artwork prompt</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">Write naturally. Describe the product, style, colours, imagery, background, texture, mood and anything you want included. Choose a flat sticker style, add your business details and generate a reusable prompt for an external AI design tool.</p>
            <textarea value={creativeBrief} onChange={(event) => setCreativeBrief(event.target.value)} rows={5} maxLength={4000} placeholder="Example: I make premium ginger and hibiscus drink. I want a bold, refreshing label with a rich burgundy-to-ruby background, realistic hibiscus flowers and fresh ginger, subtle condensation, elegant cream typography, a premium glass-bottle feel, and a clean space for ingredients." className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/30"/>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{creativeBrief.length}/4,000 characters · no image API used</span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={openChatGPTDesigner} className="gap-2"><Sparkles className="h-4 w-4"/> Open ChatGPT Designer</Button>
                <Button type="button" variant="outline" onClick={copyFullDesignPrompt}>Copy full prompt</Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Your selected style direction and customer details are included in the prompt. The customer presses Send in ChatGPT, downloads the generated image, then returns here to submit it for artwork review.</p>
          </div>

          <div className="rounded-2xl border border-border p-4 md:p-5">
            <h2 className="font-semibold">3. Choose size and quantity</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-sm font-medium">Label shape
                <select value={shape} onChange={(e) => setShape(e.target.value as Shape)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3">
                  <option value="round">Round</option><option value="square">Square</option><option value="rectangle">Rectangle</option><option value="oval">Oval</option><option value="custom">Custom die-cut</option>
                </select>
              </label>
              <label className="text-sm font-medium">Width (mm)
                <input type="number" min="20" max="300" value={width} onChange={(e) => setWidth(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/>
              </label>
              <label className="text-sm font-medium">Height (mm)
                <input type="number" min="20" max="300" value={height} onChange={(e) => setHeight(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/>
              </label>
              <label className="text-sm font-medium col-span-2">How many?
                <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3">
                  {["50","100","200","500","1000"].map((n) => <option key={n} value={n}>{Number(n).toLocaleString("en-NG")} pieces</option>)}
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
            <div className="mt-3 overflow-hidden rounded-xl bg-[#f4f1ec] p-3 shadow-inner">
              <div dangerouslySetInnerHTML={{ __html: makeSvg(design, Number(width) || 50, Number(height) || 50, true) }} />
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600"/>
              This is a low-resolution preview, not the final production artwork.
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={saveDraft} className="gap-2"><Save className="h-4 w-4"/> Save draft</Button>
              <Button variant="outline" onClick={() => { selectTemplate(TEMPLATES[0]); setBrand(""); setProduct(""); setTagline(""); setPrintPhone(""); setPrintSocials(""); setPrintWebsite(""); setWidth("50"); setHeight("50"); setQuantity("100"); setNotice("Started a new blank label."); }} className="gap-2"><RotateCcw className="h-4 w-4"/> Reset</Button>
            </div>
            <Button onClick={downloadPreview} variant="secondary" className="mt-2 w-full gap-2"><Download className="h-4 w-4"/> Download preview</Button>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <h3 className="font-semibold">Upload your ChatGPT artwork</h3>
              <p className="mt-1 text-xs text-muted-foreground">After generating your artwork in an external AI tool, download it and select it here. It will be uploaded privately to your customer account during checkout. PNG, JPG, JPEG or PDF · maximum 20 MB.</p>
              <input type="file" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" onChange={(event) => setArtworkFile(event.target.files?.[0] ?? null)} className="mt-3 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-primary-foreground"/>
              {artworkFile && <p className="mt-2 break-all text-xs font-medium text-foreground">Selected: {artworkFile.name} · {(artworkFile.size / (1024 * 1024)).toFixed(2)} MB</p>}
            </div>
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
              <Button onClick={placeOrderAndPay} disabled={checkoutBusy || retailEstimate == null || !artworkFile} className="mt-3 w-full gap-2">
                {checkoutBusy ? "Uploading artwork & preparing checkout…" : "Upload artwork, create order & pay"}
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground">Your artwork is stored privately with your order. Sleekblue reviews the file and confirms production specifications before printing.</p>
            </div>
            <Button onClick={sendToWhatsApp} className="mt-2 w-full gap-2"><MessageCircle className="h-4 w-4"/> Send to Sleekblue on WhatsApp</Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">WhatsApp: +234 805 816 2036</p>
            {notice && <p role="status" className="mt-3 rounded-lg bg-muted p-2 text-xs">{notice}</p>}
          </div>
          <div className="rounded-2xl border border-border p-4 text-sm">
            <div className="font-semibold">What happens next?</div>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs text-muted-foreground">
              <li>Generate your artwork in ChatGPT, download it, then submit it with your order for review.</li>
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
