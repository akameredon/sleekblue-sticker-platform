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
  referenceImage: string;
  sourceUrl: string;
  direction: string;
};

const TEMPLATES: Template[] = [
  { id: "botanical-jar", name: "Botanical jar", category: "Natural food, skincare & wellness", brand: "", product: "", tagline: "", color: "#E7DDC9", accent: "#3D5142", shape: "round", referenceImage: "https://images.pexels.com/photos/11159158/pexels-photo-11159158.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/jar-with-blank-label-11159158/", direction: "Natural premium jar label, warm rustic styling, botanical ingredients, tactile cream paper, earthy greens and browns, elegant readable typography." },
  { id: "botanical-bottle", name: "Botanical bottle", category: "Oils, drinks & natural products", brand: "", product: "", tagline: "", color: "#DCE4D9", accent: "#355447", shape: "rectangle", referenceImage: "https://images.pexels.com/photos/11441227/pexels-photo-11441227.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/bottle-with-blank-label-11441227/", direction: "Refined brown-glass bottle label, botanical styling, natural textures, deep green and warm neutral colours, clean hierarchy and premium editorial typography." },
  { id: "minimal-bottle", name: "Minimal bottle", category: "Beauty, fragrance & premium drinks", brand: "", product: "", tagline: "", color: "#F1EDE5", accent: "#343434", shape: "rectangle", referenceImage: "https://images.pexels.com/photos/6800931/pexels-photo-6800931.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/glass-transparent-brown-mockup-6800931/", direction: "Minimal premium bottle label, generous negative space, crisp alignment, restrained monochrome palette, refined typography and subtle material detail." },
  { id: "floral-skincare", name: "Floral skincare", category: "Beauty & personal care", brand: "", product: "", tagline: "", color: "#E9D9D5", accent: "#79594F", shape: "round", referenceImage: "https://images.pexels.com/photos/36898534/pexels-photo-36898534.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/elegant-skincare-cream-jar-with-floral-decor-36898534/", direction: "Soft botanical skincare label, delicate floral elements, muted blush and warm neutrals, elegant typography and clean premium cosmetic finish." },
  { id: "clean-range", name: "Clean product range", category: "Skincare & wellness", brand: "", product: "", tagline: "", color: "#EEECE6", accent: "#4C514C", shape: "rectangle", referenceImage: "https://images.pexels.com/photos/8100691/pexels-photo-8100691.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/white-and-brown-bottles-on-white-textile-8100691/", direction: "Coordinated clean-label identity, soft neutral background, balanced information hierarchy, subtle texture, understated typography and premium spacing." },
  { id: "artisan-jar", name: "Artisan jar", category: "Food, body butter & handmade goods", brand: "", product: "", tagline: "", color: "#E8D9C7", accent: "#694B3A", shape: "round", referenceImage: "https://images.pexels.com/photos/7795851/pexels-photo-7795851.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/brown-glass-jar-with-a-blank-label-7795851/", direction: "Artisan jar label with tactile paper, warm natural tones, clear product naming, handmade character and restrained premium layout." },
  { id: "bold-colour", name: "Bold colour", category: "Food, confectionery & lifestyle", brand: "", product: "", tagline: "", color: "#DDE6F4", accent: "#243B68", shape: "square", referenceImage: "https://images.pexels.com/photos/8947557/pexels-photo-8947557.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/close-up-of-blue-container-8947557/", direction: "Bold contemporary label, confident colour blocking, strong contrast, expressive but readable typography and a clear focal point." },
  { id: "candle", name: "Candle & home", category: "Candles, home fragrance & gifts", brand: "", product: "", tagline: "", color: "#E5DDD2", accent: "#4D4037", shape: "rectangle", referenceImage: "https://images.pexels.com/photos/6311860/pexels-photo-6311860.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/assorted-glass-containers-with-candles-6311860/", direction: "Refined candle or home-fragrance label, warm ambient mood, understated typography, tactile stock appearance and elegant spacing." },
  { id: "clean-tub", name: "Clean tub label", category: "Food, wellness & household", brand: "", product: "", tagline: "", color: "#F1F0EA", accent: "#394A50", shape: "rectangle", referenceImage: "https://images.pexels.com/photos/8066772/pexels-photo-8066772.jpeg?auto=compress&cs=tinysrgb&w=900", sourceUrl: "https://www.pexels.com/photo/white-plastic-container-with-no-label-on-white-background-8066772/", direction: "Clean modern tub label, strong legibility, simple grid, calm neutral colours and practical retail-ready finish." },
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
  const labelShape = template.shape === "round"
    ? '<circle cx="450" cy="450" r="390" fill="url(#labelBase)" stroke="url(#labelRim)" stroke-width="18" filter="url(#labelShadow)"/>'
    : `<rect x="58" y="88" width="784" height="724" rx="${template.shape === "oval" ? 350 : 48}" fill="url(#labelBase)" stroke="url(#labelRim)" stroke-width="18" filter="url(#labelShadow)"/>`;
  const motif = template.id === "glow"
    ? '<path d="M160 650 C250 500 250 350 175 245 M175 430 C90 390 100 300 175 245 M175 430 C265 390 280 315 175 245" fill="none" stroke="#ffffff" stroke-width="12" opacity=".48"/><circle cx="700" cy="230" r="92" fill="#ffffff" opacity=".16"/>'
    : template.id === "sip"
    ? '<path d="M110 650 C280 530 330 780 510 630 S730 560 810 660" fill="none" stroke="#ffffff" stroke-width="28" opacity=".26"/><circle cx="720" cy="230" r="86" fill="#ffffff" opacity=".2"/>'
    : template.id === "honey"
    ? '<g fill="none" stroke="#ffffff" stroke-width="8" opacity=".32"><path d="M710 180 l55 32 v64 l-55 32 -55 -32 v-64z M765 276 l55 32 v64 l-55 32 -55 -32 v-64z M655 276 l55 32 v64 l-55 32 -55 -32 v-64z"/></g>'
    : template.id === "bake"
    ? '<path d="M120 220 Q450 90 780 220 M120 680 Q450 810 780 680" fill="none" stroke="#ffffff" stroke-width="10" opacity=".42"/><g fill="#ffffff" opacity=".28"><circle cx="190" cy="320" r="9"/><circle cx="710" cy="580" r="12"/><circle cx="690" cy="350" r="7"/><circle cx="230" cy="590" r="8"/></g>'
    : '<g fill="none" stroke="#ffffff" stroke-width="7" opacity=".28"><circle cx="450" cy="450" r="300"/><circle cx="450" cy="450" r="270"/></g><path d="M155 710 Q450 600 745 710" fill="none" stroke="#ffffff" stroke-width="12" opacity=".25"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 900 900">
    <defs>
      <linearGradient id="labelBase" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${template.color}"/><stop offset=".58" stop-color="${template.color}"/><stop offset="1" stop-color="${template.accent}" stop-opacity=".24"/></linearGradient>
      <linearGradient id="labelRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".48" stop-color="${template.accent}"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
      <radialGradient id="labelLight" cx="25%" cy="18%" r="85%"><stop offset="0" stop-color="#ffffff" stop-opacity=".7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
      <filter id="labelShadow" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="18"/><feOffset dx="0" dy="18" result="offset"/><feComponentTransfer><feFuncA type="linear" slope=".3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="softTexture"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="2" seed="8"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter>
      <clipPath id="labelClip">${template.shape === "round" ? '<circle cx="450" cy="450" r="390"/>' : `<rect x="58" y="88" width="784" height="724" rx="${template.shape === "oval" ? 350 : 48}"/>`}</clipPath>
    </defs>
    <rect width="900" height="900" fill="#f4f1ec"/>
    <ellipse cx="450" cy="820" rx="280" ry="28" fill="#111111" opacity=".12"/>
    ${labelShape}
    <g clip-path="url(#labelClip)">
      <rect x="40" y="60" width="820" height="780" fill="url(#labelLight)"/>
      ${motif}
      <rect x="40" y="60" width="820" height="780" filter="url(#softTexture)" opacity=".34"/>
    </g>
    <rect x="105" y="145" width="690" height="610" rx="28" fill="none" stroke="${template.accent}" stroke-width="3" opacity=".35"/>
    <text x="450" y="245" text-anchor="middle" font-family="Georgia,serif" font-size="28" font-weight="700" letter-spacing="4" fill="${template.accent}">${safe(template.brand.slice(0, 28))}</text>
    <path d="M250 285 H650" stroke="${template.accent}" stroke-width="3" opacity=".48"/>
    <text x="450" y="420" text-anchor="middle" font-family="Georgia,serif" font-size="60" font-weight="700" fill="${template.accent}">${safe(template.product.slice(0, 22))}</text>
    <text x="450" y="485" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#30343b">${safe(template.tagline.slice(0, 48))}</text>
    <rect x="290" y="545" width="320" height="62" rx="31" fill="${template.accent}"/>
    <text x="450" y="585" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="1" fill="#ffffff">MADE IN NIGERIA</text>
    ${preview ? '<g opacity=".13" transform="rotate(-28 450 450)"><text x="450" y="470" text-anchor="middle" font-family="Arial,sans-serif" font-size="74" font-weight="800" fill="#111111">DESIGN PREVIEW</text><text x="450" y="555" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#111111">NOT A PRINT FILE</text></g>' : ""}
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
        setTemplateId(draft.templateId ?? "botanical-jar");
        setBrand(draft.brand ?? "");
        setProduct(draft.product ?? "");
        setTagline(draft.tagline ?? "");\n        setPrintPhone(draft.printPhone ?? "");
        setPrintSocials(draft.printSocials ?? "");
        setPrintWebsite(draft.printWebsite ?? "");
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
      templateId, brand, product, tagline, printPhone, printSocials, printWebsite, color, accent, shape, width, height, quantity, visibility,
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
      ["Printed phone", printPhone], ["Printed social handle", printSocials],
      ["Printed website", printWebsite], ["Tagline", tagline],
      ["Label shape", shape], ["Finished size", `${width} mm × ${height} mm`],
      ["Quantity", quantity], ["Colour preference", `${color} background, ${accent} text/accent`],
      ["Selected gallery reference", selected.name], ["Visual direction", selected.direction],
      ["Customer's extra instructions", creativeBrief],
    ].filter(([, value]) => String(value ?? "").trim()).map(([key, value]) => `${key}: ${value}`);
    return [
      "Create an original, professional, print-ready flat product label using the customer details and selected visual reference below.",
      "Ask only for missing essentials, one concise question at a time: business/brand name and product name. If printed phone, social handle, website or tagline fields are blank, ask briefly whether the customer wants any of them printed. Never invent names, contact details, ingredients, claims or certifications.",
      "If information is already supplied, do not ask again. Offer short numbered choices only for unresolved decisions. The customer may say 'choose for me'.",
      "Follow the selected reference's overall composition, mood, palette, typography and material feel, while creating original artwork rather than copying the reference image. Preserve the confirmed shape and exact physical proportions. Keep all text readable and inside a safe margin. No filler text, emojis, random icons, fake badges or unsupported claims.",
      "Output clean front-facing flat label artwork, not a product mockup. Show the entire label, undistorted and ready for print review. Use only confirmed customer details.",
      "", "CUSTOMER PROJECT", ...details,
      `Reference image: ${selected.referenceImage}`,
      `Reference source: ${selected.sourceUrl}`,
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
    if (!creativeBrief.trim() && !brand.trim() && !product.trim()) {
      setNotice("Describe the label you want, or enter your brand and product details first.");
      return;
    }
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
    if (!artworkFile) {
      setNotice("Download your generated design from ChatGPT and select the artwork file here before checkout.");
      return;
    }
    const allowedArtworkTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf", "application/postscript"]);
    if (artworkFile.size > 20 * 1024 * 1024 || !allowedArtworkTypes.has(artworkFile.type.toLowerCase())) {
      setNotice("Choose a PNG, JPG, WEBP, SVG, PDF or EPS artwork file up to 20 MB.");
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
        templateId, brand, product, tagline, printPhone, printSocials, printWebsite, color, accent, shape,
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
            <Sparkles className="h-3.5 w-3.5" /> FREE LABEL DESIGN STUDIO
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Make your product label.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Describe the label you imagine, open your tailored design prompt in ChatGPT, then download the artwork and submit it to Sleekblue. No design skills or image API required.
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
                <div key={t.id} className={`overflow-hidden rounded-2xl border bg-card transition ${templateId === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
                  <button type="button" onClick={() => selectTemplate(t)} className="block w-full text-left">
                    <img src={t.referenceImage} alt={t.name + " label inspiration"} loading="lazy" className="aspect-[4/3] w-full object-cover"/>
                    <div className="p-3">
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.category}</div>
                      <div className="mt-2 text-xs font-semibold text-primary">{templateId === t.id ? "Selected reference" : "Use this style"}</div>
                    </div>
                  </button>
                  <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">Photo: <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="underline">Pexels source</a></div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-accent/10 p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/><h2 className="font-semibold">Describe the design you want</h2></div>
            <p className="mt-2 text-sm text-muted-foreground">Write naturally. Describe the product, style, colours, imagery, background, texture, mood and anything you want included. Choose a visual reference, add your business details and open a short, tailored design prompt in ChatGPT.</p>
            <textarea value={creativeBrief} onChange={(event) => setCreativeBrief(event.target.value)} rows={5} maxLength={4000} placeholder="Example: I make premium ginger and hibiscus drink. I want a bold, refreshing label with a rich burgundy-to-ruby background, realistic hibiscus flowers and fresh ginger, subtle condensation, elegant cream typography, a premium glass-bottle feel, and a clean space for ingredients." className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/30"/>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{creativeBrief.length}/4,000 characters · no image API used</span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={openChatGPTDesigner} className="gap-2"><Sparkles className="h-4 w-4"/> Open ChatGPT Designer</Button>
                <Button type="button" variant="outline" onClick={copyFullDesignPrompt}>Copy full prompt</Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">ChatGPT opens with your selected design reference and customer details prepared. The customer presses Send in ChatGPT, downloads the generated image, then returns here to submit it for artwork review.</p>
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
                <input value={tagline} onChange={(e) => { setTagline(e.target.value); setSaved(false); }} maxLength={48} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Optional short message"/>
              </label>
              <label className="text-sm font-medium sm:col-span-2">Phone / contact to print (optional)
                <input value={printPhone} onChange={(e) => setPrintPhone(e.target.value)} maxLength={40} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Only if you want it printed on the label"/>
              </label>
              <label className="text-sm font-medium">Social handle to print (optional)
                <input value={printSocials} onChange={(e) => setPrintSocials(e.target.value)} maxLength={60} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="@yourbusiness"/>
              </label>
              <label className="text-sm font-medium">Website to print (optional)
                <input value={printWebsite} onChange={(e) => setPrintWebsite(e.target.value)} maxLength={100} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="www.yourbusiness.com"/>
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
              <p className="mt-1 text-xs text-muted-foreground">After generating in ChatGPT, download the image and select it here. It will be uploaded privately to your customer account during checkout. PNG, JPG, WEBP, SVG, PDF or EPS · maximum 20 MB.</p>
              <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.eps,.ps,image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,application/postscript" onChange={(event) => setArtworkFile(event.target.files?.[0] ?? null)} className="mt-3 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-primary-foreground"/>
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
