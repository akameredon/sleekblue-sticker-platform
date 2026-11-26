import { useEffect, useState } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/paths";
import { CheckCircle2, Clock3, AlertCircle } from "lucide-react";

type PendingPayment = {
  reference: string;
  phone: string;
  orderReference: string;
};

export function PaymentReturnPage() {
  const [state, setState] = useState<"checking" | "paid" | "pending" | "error">("checking");
  const [message, setMessage] = useState("Checking your payment with Paystack…");
  const [orderReference, setOrderReference] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      let pending: PendingPayment | null = null;
      try {
        const raw = sessionStorage.getItem("labelflow-pending-payment");
        pending = raw ? JSON.parse(raw) as PendingPayment : null;
      } catch { pending = null; }

      const queryReference = new URLSearchParams(window.location.search).get("reference");
      const reference = queryReference || pending?.reference || "";
      if (!reference || !pending?.phone) {
        setState("error");
        setMessage("We could not match this payment to the order on this device. Please use your order reference and phone number to contact Sleekblue.");
        return;
      }
      setOrderReference(pending.orderReference);

      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (cancelled) return;
        attempts += 1;
        try {
          const response = await fetch(apiUrl(`/payments/${encodeURIComponent(reference)}?phone=${encodeURIComponent(pending!.phone)}`));
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Payment status could not be checked.");
          if (data.status === "success" || data.orderStatus === "confirmed") {
            try { sessionStorage.removeItem("labelflow-pending-payment"); } catch { /* ignore */ }
            if (!cancelled) {
              setState("paid");
              setMessage("Payment confirmed. Sleekblue has received your order and will confirm production details.");
            }
            return;
          }
          if (attempts >= 12) {
            if (!cancelled) {
              setState("pending");
              setMessage("Your payment is not confirmed yet. If Paystack showed a successful payment, please wait a little and contact Sleekblue with your order reference.");
            }
            return;
          }
          timer = setTimeout(poll, 2500);
        } catch (error) {
          if (attempts >= 3) {
            if (!cancelled) {
              setState("error");
              setMessage(error instanceof Error ? error.message : "Could not verify payment.");
            }
            return;
          }
          timer = setTimeout(poll, 2500);
        }
      };
      await poll();
    };

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const Icon = state === "paid" ? CheckCircle2 : state === "checking" || state === "pending" ? Clock3 : AlertCircle;

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-xl items-center justify-center px-4 py-16">
      <section className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <Icon className={`mx-auto h-12 w-12 ${state === "paid" ? "text-green-600" : state === "error" ? "text-destructive" : "text-primary"}`} />
        <h1 className="mt-4 text-2xl font-bold">
          {state === "paid" ? "Payment confirmed" : state === "checking" ? "Verifying payment" : state === "pending" ? "Payment processing" : "Payment check needs help"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        {orderReference && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">Order reference: <strong>{orderReference}</strong></p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/track" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Track an order</Link>
          <Link href="/" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
