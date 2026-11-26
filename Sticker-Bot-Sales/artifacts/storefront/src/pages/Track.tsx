import { useEffect, useState } from "react";
import { useLookupOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNGN } from "@/lib/format";
import { apiUrl } from "@/lib/paths";
import { Search, Package, MessageCircle } from "lucide-react";
import { format } from "date-fns";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "bg-primary/15 text-foreground" },
  pending_whatsapp: { label: "Awaiting WhatsApp confirmation", tone: "bg-primary/15 text-foreground" },
  confirmed: { label: "Confirmed", tone: "bg-accent/15 text-foreground" },
  in_production: { label: "In production", tone: "bg-primary/20 text-foreground" },
  ready: { label: "Ready for pickup / shipping", tone: "bg-accent/25 text-foreground" },
  shipped: { label: "Shipped", tone: "bg-accent/30 text-foreground" },
  delivered: { label: "Delivered", tone: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/15 text-destructive" },
};

export function TrackPage() {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("ref");
    if (ref) setReference(ref);
  }, []);

  const lookup = useLookupOrder({
    mutation: {
      onError: (e: unknown) => {
        const m = e instanceof Error ? e.message : "Could not find that order.";
        setSubmitErr(m);
      },
    },
  });

  const order = lookup.data;
  const canSubmit = reference.trim().length > 3 && phone.replace(/\D/g, "").length >= 10 && !lookup.isPending;

  const submit = () => {
    setSubmitErr(null);
    if (!canSubmit) return;
    lookup.mutate({ data: { reference: reference.trim(), phone: phone.trim() } });
  };

  const statusInfo = order ? STATUS_LABEL[order.status] ?? { label: order.status, tone: "bg-muted text-foreground" } : null;

  const retryPayment = async () => {
    if (!order?.customerEmail || !order.customerPhone || paymentBusy) return;
    setPaymentBusy(true);
    setSubmitErr(null);
    try {
      const response = await fetch(apiUrl("/payments/initialize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
        }),
      });
      const payment = await response.json();
      if (!response.ok) throw new Error(payment.error || "Could not restart payment.");
      try {
        sessionStorage.setItem("labelflow-pending-payment", JSON.stringify({
          reference: payment.reference,
          phone: order.customerPhone,
          orderReference: order.reference,
        }));
      } catch { /* payment can continue without session storage */ }
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      setSubmitErr(error instanceof Error ? error.message : "Could not restart payment.");
    } finally {
      setPaymentBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
      <div className="text-center">
        <Package className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Track your order</h1>
        <p className="mt-2 text-muted-foreground">
          Enter your order reference and the phone number you used at checkout.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-card-border bg-card p-5 md:p-6">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Order reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="SL-XXXXXX"
              className="mt-1"
              data-testid="input-track-ref"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Phone number (enter at least 10 digits)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              className="mt-1"
              data-testid="input-track-phone"
            />
          </div>
          <Button onClick={submit} disabled={!canSubmit} size="lg" data-testid="button-track-submit">
            <Search className="h-4 w-4" />
            {lookup.isPending ? "Looking…" : "Track"}
          </Button>
        </div>
        {submitErr ? (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {submitErr}
          </div>
        ) : null}
      </div>

      {order ? (
        <div className="mt-6 rounded-2xl border border-card-border bg-card p-5 md:p-6" data-testid="track-result">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Reference</div>
              <div className="font-semibold text-lg">{order.reference}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Placed {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mma")}
              </div>
            </div>
            {statusInfo ? (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.tone}`}>
                {statusInfo.label}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-1 text-sm">
            <Row label="Customer" value={order.customerName} />
            <Row label="Phone" value={order.customerPhone} />
            {order.deliveryMethod ? <Row label="Fulfillment" value={order.deliveryMethod} /> : null}
            {order.deliveryAddress ? <Row label="Address" value={order.deliveryAddress} /> : null}
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</div>
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.quantity} × {it.sizeLabel} · {it.finishLabel}
                  </div>
                </div>
                <div className="font-semibold">{formatNGN(it.lineTotal)}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-serif text-2xl font-semibold">{formatNGN(order.total)}</span>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {order.status === "pending_payment" && order.customerEmail ? (
              <Button className="flex-1" size="lg" onClick={retryPayment} disabled={paymentBusy}>
                {paymentBusy ? "Opening payment…" : "Retry secure payment"}
              </Button>
            ) : null}
            <a
              href={order.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1"
              data-testid="link-track-whatsapp"
            >
              <Button className="w-full" size="lg">
                <MessageCircle className="h-4 w-4" />
                Open in WhatsApp
              </Button>
            </a>

          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
