import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useCreateOrder,
  useGetShopInfo,
} from "@workspace/api-client-react";
import { cart, useCart, useCartSubtotal } from "@/lib/cart";
import { useUpload } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StickerImage } from "@/components/StickerImage";
import { formatNGN, formatNumber } from "@/lib/format";
import { ChevronLeft, FileUp, MessageCircle, Paperclip, ShoppingBag, Trash2, X } from "lucide-react";

export function CartPage() {
  const items = useCart();
  const subtotal = useCartSubtotal();
  const { data: shop } = useGetShopInfo();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"Pickup" | "Doorstep delivery">("Pickup");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [artworks, setArtworks] = useState<{ name: string; objectPath: string }[]>([]);
  const { uploadFile, isUploading, error: uploadErr, setError: setUploadErr } = useUpload();

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        cart.clear();
        navigate(`/track?reference=${encodeURIComponent(order.reference)}`);
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Could not place order. Please try again.";
        setSubmitErr(msg);
      },
    },
  });

  const canSubmit = items.length > 0 && name.trim().length > 1 && phone.trim().length >= 6 && !createOrder.isPending;

  const submit = () => {
    setSubmitErr(null);
    if (!canSubmit) return;
    createOrder.mutate({
      data: {
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        deliveryMethod,
        deliveryAddress: deliveryMethod === "Doorstep delivery" ? address.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        artworkUrls: artworks.length ? artworks.map((a) => a.objectPath) : undefined,
        items: items.map((i) => ({
          productSlug: i.productSlug,
          productName: i.productName,
          sizeLabel: i.sizeLabel,
          finishLabel: i.finishLabel,
          quantity: i.quantity,
          widthMm: i.widthMm,
          heightMm: i.heightMm,
          unitPrice: i.unitPrice,
          notes: i.notes,
        })),
      },
    });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center md:px-6">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-serif text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse the shop or chat with our AI to get a custom quote.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/shop"><Button>Browse stickers</Button></Link>
          <Link href="/chat"><Button variant="outline">Chat with AI</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Continue shopping
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Your cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* ITEMS */}
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex gap-4 rounded-2xl border border-card-border bg-card p-4">
              <div className="grid h-20 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                <StickerImage src={it.imageUrl} alt={it.productName} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{it.productName}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {it.sizeLabel}
                      {it.widthMm && it.heightMm ? ` (${it.widthMm}×${it.heightMm}mm)` : ""} · {it.finishLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cart.remove(it.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover-elevate"
                    aria-label="Remove"
                    data-testid={`button-remove-${it.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border hover-elevate"
                      onClick={() => cart.update(it.id, { quantity: Math.max(1, it.quantity - 10) })}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => cart.update(it.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-20 rounded-lg border border-input bg-card px-2 py-1.5 text-center text-sm"
                    />
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-border hover-elevate"
                      onClick={() => cart.update(it.id, { quantity: it.quantity + 10 })}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{formatNGN(it.unitPrice)} each</div>
                    <div className="font-semibold">{formatNGN(it.unitPrice * it.quantity)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CHECKOUT */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-card-border bg-card p-5">
            <h2 className="font-serif text-xl font-semibold">Checkout</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              We'll send your order summary to WhatsApp so we can confirm the design and arrange delivery.
            </p>

            <p className="mt-2 text-xs text-muted-foreground">Doorstep delivery is arranged separately after a location-based quote. Pickup is currently the only selectable checkout option.</p>

            <div className="mt-5 space-y-3">
              <Field label="Your name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okoye" data-testid="input-name" />
              </Field>
              <Field label="WhatsApp phone" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" data-testid="input-phone" />
              </Field>
              <Field label="Email (optional)">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" data-testid="input-email" />
              </Field>
              <Field label="Fulfillment">
                <div className="grid grid-cols-2 gap-2">
                  {(["Pickup", "Doorstep delivery"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDeliveryMethod(opt)}
                      disabled={opt === "Doorstep delivery"}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium hover-elevate ${
                        deliveryMethod === opt
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      }`}
                      data-testid={`button-delivery-${opt.toLowerCase().replace(/\W+/g, "-")}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
              {deliveryMethod === "Doorstep delivery" ? (
                <Field label="Delivery address">
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, area, landmark, city"
                    rows={2}
                    data-testid="input-address"
                  />
                </Field>
              ) : null}
              <Field label="Notes for the studio (optional)">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Brand colors, deadline, design link..."
                  rows={3}
                  data-testid="input-notes"
                />
              </Field>
              <Field label="Artwork files (optional — sign in first)">
                <label
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-sm hover-elevate ${
                    isUploading ? "opacity-60" : ""
                  }`}
                  data-testid="input-artwork"
                >
                  <FileUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {isUploading ? "Uploading…" : "Upload PNG, JPG, PDF, AI, SVG"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf,application/postscript,.ai,.svg,.eps"
                    multiple
                    className="hidden"
                    disabled={isUploading}
                    onChange={async (e) => {
                      setUploadErr(null);
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      for (const file of files) {
                        const res = await uploadFile(file);
                        if (res) {
                          setArtworks((prev) => [
                            ...prev,
                            { name: res.name, objectPath: res.objectPath },
                          ]);
                        }
                      }
                    }}
                  />
                </label>
                {uploadErr ? (
                  <div className="mt-2 text-xs text-destructive">{uploadErr}</div>
                ) : null}
                {artworks.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {artworks.map((a, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                        data-testid={`artwork-item-${idx}`}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate">{a.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setArtworks((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-md p-1 text-muted-foreground hover-elevate"
                          aria-label="Remove file"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Field>
            </div>

            <div className="mt-5 space-y-1 text-sm">
              <Row label={`Subtotal (${formatNumber(items.reduce((s, i) => s + i.quantity, 0))} stickers)`} value={formatNGN(subtotal)} />
              <Row label="Delivery" value="Quoted on WhatsApp" muted />
              <div className="my-2 border-t border-border" />
              <Row label="Estimated total" value={formatNGN(subtotal)} bold />
            </div>

            {submitErr ? (
              <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {submitErr}
              </div>
            ) : null}

            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={submit}
              disabled={!canSubmit}
              data-testid="button-place-order"
            >
              <MessageCircle className="h-4 w-4" />
              {createOrder.isPending ? "Placing order…" : "Place order & open WhatsApp"}
            </Button>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              By placing this order you'll be redirected to WhatsApp ({shop?.whatsappDisplay ?? "+234 …"}) with your full order details so we can confirm and ship.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={bold ? "font-semibold text-base" : ""}>{value}</span>
    </div>
  );
}
