import { useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import { useGetOrderById, useGetShopInfo } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNGN, formatNumber } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";
import { CheckCircle2, ChevronLeft, MessageCircle } from "lucide-react";

export function OrderDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: order, isLoading, isError } = useGetOrderById(id, {
    query: { enabled: Number.isFinite(id) && id > 0 } as never,
  });
  const { data: shop } = useGetShopInfo();

  const whatsappLink = useMemo(() => {
    if (!order || !shop) return "";
    const text =
      `Hi ${shop.businessName}! New order ${order.reference}\n\n` +
      order.items
        .map(
          (it) =>
            `• ${it.quantity} × ${it.productName} (${it.sizeLabel}${
              it.widthMm && it.heightMm ? ` ${it.widthMm}×${it.heightMm}mm` : ""
            }, ${it.finishLabel}) — ${formatNGN(it.lineTotal)}`,
        )
        .join("\n") +
      `\n\nSubtotal: ${formatNGN(order.subtotal)}` +
      `\nFulfillment: ${order.deliveryMethod ?? "Pickup"}` +
      (order.deliveryAddress ? `\nAddress: ${order.deliveryAddress}` : "") +
      (order.notes ? `\nNotes: ${order.notes}` : "") +
      `\n\nName: ${order.customerName}\nPhone: ${order.customerPhone}` +
      (order.customerEmail ? `\nEmail: ${order.customerEmail}` : "");
    return whatsappUrl(shop.whatsappNumber, text);
  }, [order, shop]);

  // Auto-open WhatsApp once
  useEffect(() => {
    if (!whatsappLink) return;
    const opened = sessionStorage.getItem(`stickerlab.opened.${id}`);
    if (opened) return;
    sessionStorage.setItem(`stickerlab.opened.${id}`, "1");
    const t = setTimeout(() => {
      window.open(whatsappLink, "_blank", "noopener,noreferrer");
    }, 600);
    return () => clearTimeout(t);
  }, [whatsappLink, id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
    );
  }
  if (isError || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center md:px-6">
        <h1 className="font-serif text-3xl font-semibold">Order not found</h1>
        <Link href="/shop"><Button className="mt-6">Back to shop</Button></Link>
      </div>
    );
  }

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="mt-6 rounded-3xl border border-card-border bg-card p-6 md:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">Order received</h1>
          <p className="text-sm text-muted-foreground">
            Reference <span className="font-mono font-semibold text-foreground">{order.reference}</span>
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-muted/50 p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order summary</div>
          <ul className="space-y-3 text-sm">
            {order.items.map((it, idx) => (
              <li key={idx} className="flex justify-between gap-4">
                <div>
                  <div className="font-medium">{it.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.quantity} × {it.sizeLabel}
                    {it.widthMm && it.heightMm ? ` (${it.widthMm}×${it.heightMm}mm)` : ""} · {it.finishLabel}
                  </div>
                </div>
                <div className="font-semibold whitespace-nowrap">{formatNGN(it.lineTotal)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal ({formatNumber(totalQty)})</span><span>{formatNGN(order.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>Quoted on WhatsApp</span></div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold"><span>Estimated total</span><span>{formatNGN(order.total)}</span></div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <Detail label="Name" value={order.customerName} />
          <Detail label="Phone" value={order.customerPhone} />
          {order.customerEmail ? <Detail label="Email" value={order.customerEmail} /> : null}
          <Detail label="Fulfillment" value={order.deliveryMethod ?? "Pickup"} />
          {order.deliveryAddress ? <Detail label="Address" value={order.deliveryAddress} /> : null}
          {order.notes ? <Detail label="Notes" value={order.notes} /> : null}
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover-elevate"
          data-testid="link-whatsapp-order"
        >
          <MessageCircle className="h-4 w-4" />
          Open WhatsApp to confirm
        </a>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Didn't open? Tap the button above. We'll confirm artwork, delivery and total on WhatsApp.
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-card-border bg-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
