import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, Download, Lock, Printer, Scissors } from "lucide-react";
import { apiUrl } from "@/lib/paths";
import { authHeaders } from "@/lib/auth";

type LabelShape = "round" | "oval" | "rectangle";

type ArtworkInput = {
  brand: string;
  product: string;
  tagline: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  shape: LabelShape;
  background: string;
  ink: string;
};

const DEFAULTS: ArtworkInput = {
  brand: "MAMA'S KITCHEN",
  product: "JOLLOF SPICE",
  tagline: "Made with love • 100% natural",
  widthMm: 50,
  heightMm: 50,
  bleedMm: 3,
  shape: "round",
  background: "#F7E7C6",
  ink: "#B83B25",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] ?? character);
}

function validate(input: ArtworkInput): string | null {
  if (![input.widthMm, input.heightMm, input.bleedMm].every(Number.isFinite)) return "Enter valid millimetre dimensions.";
  if (input.widthMm < 20 || input.heightMm < 20 || input.widthMm > 300 || input.heightMm > 300) return "Label width and height must each be between 20 mm and 300 mm.";
  if (input.bleedMm < 0 || input.bleedMm > 5) return "Bleed must be between 0 mm and 5 mm.";
  if (!/^#[0-9a-fA-F]{6}$/.test(input.background) || !/^#[0-9a-fA-F]{6}$/.test(input.ink)) return "Choose valid six-digit HEX colours.";
  if (!input.brand.trim() || !input.product.trim()) return "Business name and product name are required.";
  return null;
}

function cutPath(input: ArtworkInput, x: number, y: number, width: number, height: number): string {
  if (input.shape === "round") {
    const radius = Math.min(width, height) / 2;
    return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${radius}" />`;
  }
  if (input.shape === "oval") {
    return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" />`;
  }
  const radius = Math.min(3, width / 10, height / 10);
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" />`;
}

function makePrintSvg(input: ArtworkInput): string {
  const { widthMm: w, heightMm: h, bleedMm: b } = input;
  const pageW = w + b * 2;
  const pageH = h + b * 2;
  const minSide = Math.min(w, h);
  const centerX = b + w / 2;
  const centerY = b + h / 2;
  const brand = escapeXml(input.brand.trim().slice(0, 32));
  const product = escapeXml(input.product.trim().slice(0, 26));
  const tagline = escapeXml(input.tagline.trim().slice(0, 52));
  const background = cutPath(input, 0, 0, pageW, pageH);
  const productFont = Math.max(3, minSide * 0.105);
  const brandFont = Math.max(2.5, minSide * 0.052);
  const taglineFont = Math.max(2, minSide * 0.038);
  const safeWidth = Math.max(8, Math.min(w, h) * (input.shape === "round" ? 0.68 : 0.82));
  const productY = centerY + minSide * 0.015;
  const brandY = centerY - minSide * 0.19;
  const taglineY = centerY + minSide * 0.18;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
  <title>Sleekblue production print artwork — ${product}</title>
  <desc>Trim size ${w} by ${h} mm. Bleed ${b} mm on each side. RGB SVG master; confirm colour conversion in the printer RIP.</desc>
  <g id="PRINT_ARTWORK">
    ${background.replace("/>", ` fill="${input.background}" stroke="none" />`)}
    <text x="${centerX}" y="${brandY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${brandFont}" font-weight="700" letter-spacing="${Math.min(0.5, minSide * 0.008)}" fill="${input.ink}" textLength="${safeWidth}" lengthAdjust="spacingAndGlyphs">${brand}</text>
    <path d="M ${centerX - safeWidth * 0.42} ${centerY - minSide * 0.105} H ${centerX + safeWidth * 0.42}" fill="none" stroke="${input.ink}" stroke-width="${Math.max(0.25, minSide * 0.004)}" opacity=".45"/>
    <text x="${centerX}" y="${productY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${productFont}" font-weight="800" fill="${input.ink}" textLength="${safeWidth}" lengthAdjust="spacingAndGlyphs">${product}</text>
    <text x="${centerX}" y="${taglineY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${taglineFont}" fill="#30343B" textLength="${safeWidth}" lengthAdjust="spacingAndGlyphs">${tagline}</text>
  </g>
  <g id="TRIM_REFERENCE" display="none">${cutPath(input, b, b, w, h)}</g>
</svg>`;
}

function makeCutSvg(input: ArtworkInput): string {
  const { widthMm: w, heightMm: h, bleedMm: b } = input;
  const pageW = w + b * 2;
  const pageH = h + b * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pageW}mm" height="${pageH}mm" viewBox="0 0 ${pageW} ${pageH}">
  <title>Sleekblue MC1200 manual-alignment cutline</title>
  <desc>Cut path only. Finished trim size ${w} by ${h} mm. Page includes ${b} mm bleed offset around trim. No registration marks are included; align manually in the cutter workflow.</desc>
  <g id="CUT_CONTOUR" fill="none" stroke="#FF00FF" stroke-width="0.1">
    ${cutPath(input, b, b, w, h)}
  </g>
</svg>`;
}

function downloadSvg(filename: string, content: string) {
  const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ProductionArtworkPage() {
  const [input, setInput] = useState<ArtworkInput>(DEFAULTS);
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(apiUrl("/admin/analytics"), { headers: authHeaders() })
      .then((response) => {
        if (active) setAccess(response.ok ? "allowed" : "denied");
      })
      .catch(() => { if (active) setAccess("denied"); });
    return () => { active = false; };
  }, []);

  const update = <K extends keyof ArtworkInput>(key: K, value: ArtworkInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const exportFiles = (kind: "print" | "cut") => {
    const problem = validate(input);
    if (problem) { setMessage(problem); return; }
    const slug = input.product.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "label";
    const size = `${input.widthMm}x${input.heightMm}mm`;
    downloadSvg(`sleekblue-${slug}-${size}-${kind === "print" ? "PRINT" : "CUTLINE"}.svg`, kind === "print" ? makePrintSvg(input) : makeCutSvg(input));
    setMessage(kind === "print" ? "Print SVG exported. Open it in CorelDRAW and inspect the physical page size before printing." : "Cutline SVG exported. Import it as a separate aligned layer; this file uses manual alignment and has no registration marks.");
  };

  if (access === "checking") return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground">Checking administrator access…</div>;
  if (access === "denied") return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <Lock className="mx-auto h-8 w-8 text-muted-foreground"/>
      <h1 className="mt-3 text-xl font-semibold">Administrator access required</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in with an administrator account to use the production artwork exporter.</p>
      <Link href="/admin" className="mt-4 inline-block text-sm underline">Go to Studio Dashboard</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"><ChevronLeft className="h-4 w-4"/> Studio Dashboard</Link>
      <header className="mt-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Printer className="h-3.5 w-3.5"/> PRODUCTION ARTWORK</div>
        <h1 className="mt-3 text-3xl font-bold">CorelDRAW / MC1200 export</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create a physical-size print SVG and a separate cutter SVG for one controlled test label. These are SVG masters, not native CDR or CMYK files.</p>
      </header>

      <section className="mt-6 rounded-2xl border border-border p-4 md:p-6">
        <h2 className="font-semibold">Label artwork details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Business name<input value={input.brand} onChange={(e) => update("brand", e.target.value)} maxLength={32} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/></label>
          <label className="text-sm font-medium">Product name<input value={input.product} onChange={(e) => update("product", e.target.value)} maxLength={26} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/></label>
          <label className="text-sm font-medium sm:col-span-2">Tagline<input value={input.tagline} onChange={(e) => update("tagline", e.target.value)} maxLength={52} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/></label>
          <label className="text-sm font-medium">Width (mm)<input type="number" min="20" max="300" step="0.1" value={input.widthMm} onChange={(e) => update("widthMm", Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/></label>
          <label className="text-sm font-medium">Height (mm)<input type="number" min="20" max="300" step="0.1" value={input.heightMm} onChange={(e) => update("heightMm", Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/></label>
          <label className="text-sm font-medium">Bleed per edge (mm)<input type="number" min="0" max="5" step="0.5" value={input.bleedMm} onChange={(e) => update("bleedMm", Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"/></label>
          <label className="text-sm font-medium">Cut shape<select value={input.shape} onChange={(e) => update("shape", e.target.value as LabelShape)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3"><option value="round">Circle</option><option value="oval">Oval</option><option value="rectangle">Rounded rectangle</option></select></label>
          <label className="text-sm font-medium">Label background<div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border px-3 py-2"><input type="color" value={input.background} onChange={(e) => update("background", e.target.value)} className="h-9 w-12"/><span className="text-xs text-muted-foreground">{input.background}</span></div></label>
          <label className="text-sm font-medium">Text colour<div className="mt-1.5 flex items-center gap-3 rounded-xl border border-border px-3 py-2"><input type="color" value={input.ink} onChange={(e) => update("ink", e.target.value)} className="h-9 w-12"/><span className="text-xs text-muted-foreground">{input.ink}</span></div></label>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border p-4 md:p-6">
        <h2 className="font-semibold">Export package</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => exportFiles("print")} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4"/> Export print artwork SVG</button>
          <button type="button" onClick={() => exportFiles("cut")} className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold"><Scissors className="h-4 w-4"/> Export cutline SVG</button>
        </div>
        <p role="status" className="mt-3 text-sm text-muted-foreground">{message || "Print file includes bleed. Cutline file contains the exact trim path only. Both use the same page dimensions for manual alignment."}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <h2 className="font-semibold">Before running the MC1200</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Open the print SVG in CorelDRAW; confirm the document/page measures exactly {input.widthMm + input.bleedMm * 2} × {input.heightMm + input.bleedMm * 2} mm.</li>
          <li>Keep the print and cutline files at identical scale and page position. Do not resize one independently.</li>
          <li>Use manual alignment for this first export. No ARMS/CCD registration marks are generated until the exact sensor and software workflow are confirmed.</li>
          <li>Confirm the printer's material, ICC/RIP colour conversion, cut offset, blade and pressure with the operator. The SVG uses RGB HEX colours.</li>
          <li>In CorelDRAW, inspect text and convert text to curves if required by the production workstation; save a native CDR working copy there.</li>
        </ul>
      </section>
    </div>
  );
}
