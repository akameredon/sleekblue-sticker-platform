import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNGN } from "@/lib/format";
import { apiUrl } from "@/lib/paths";
import { BarChart2, ChevronLeft, ExternalLink, Package, ShoppingBag, TrendingUp, Users, Zap } from "lucide-react";

type Analytics = {
  dailyOrders: { date: string; orders: number; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
  finishBreakdown: { finish: string; qty: number }[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    revenueThisWeek: number;
    ordersThisMonth: number;
  };
};

type Order = {
  id: number;
  reference: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod?: string;
  subtotal: number;
  total: number;
  status: string;
  createdAt: string;
  items: { productName: string; quantity: number; sizeLabel: string; finishLabel: string; lineTotal: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  pending_whatsapp: "hsl(48 100% 52%)",
  confirmed: "hsl(145 65% 48%)",
  in_production: "hsl(210 80% 56%)",
  shipped: "hsl(270 60% 58%)",
  delivered: "hsl(150 60% 46%)",
  cancelled: "hsl(0 70% 55%)",
};

const CHART_COLORS = [
  "hsl(48 100% 52%)",
  "hsl(330 80% 60%)",
  "hsl(210 80% 56%)",
  "hsl(145 65% 48%)",
  "hsl(270 60% 58%)",
  "hsl(30 90% 55%)",
  "hsl(190 70% 50%)",
  "hsl(0 70% 55%)",
];

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "hsl(200 15% 60%)";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
      style={{ background: `${color}20`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

export function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "orders" | "customers">("overview");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(apiUrl("/admin/analytics")).then((r) => r.json()),
      fetch(apiUrl("/orders")).then((r) => r.json()),
    ])
      .then(([a, o]) => {
        setAnalytics(a);
        setOrders(Array.isArray(o) ? o : []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
        <h1 className="font-serif text-3xl font-semibold">Analytics unavailable</h1>
        <p className="mt-2 text-muted-foreground">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  const { summary, dailyOrders, topProducts, statusBreakdown, finishBreakdown } = analytics;

  const uniqueCustomers = [...new Map(orders.map((o) => [o.customerPhone, o])).values()];

  const METRICS = [
    { label: "Total orders", value: summary.totalOrders.toString(), icon: ShoppingBag, sub: `${summary.ordersThisMonth} this month` },
    { label: "Total revenue", value: formatNGN(summary.totalRevenue), icon: TrendingUp, sub: `${formatNGN(summary.revenueThisWeek)} this week` },
    { label: "Avg order value", value: formatNGN(summary.avgOrderValue), icon: Zap, sub: "per order" },
    { label: "Customers", value: uniqueCustomers.length.toString(), icon: Users, sub: `${topProducts.length} active SKUs` },
  ];

  const TABS = [
    { id: "overview" as const, label: "Overview" },
    { id: "orders" as const, label: `Orders (${orders.length})` },
    { id: "customers" as const, label: `Customers (${uniqueCustomers.length})` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ChevronLeft className="h-4 w-4" /> Home
      </Link>

      <header className="mt-4 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <BarChart2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill 12 · Graphify + Mini CRM</div>
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">Studio Dashboard</h1>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="rounded-2xl border border-card-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
              <m.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-2 font-serif text-2xl font-semibold leading-tight">{m.value}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-card-border bg-card p-5">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Orders &amp; revenue — last 30 days
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyOrders.map((d) => ({ ...d, date: shortDate(d.date) }))} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(48 100% 52%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(48 100% 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? [formatNGN(value), "Revenue"] : [value, "Orders"]
                  }
                  contentStyle={{ fontSize: 12, borderRadius: 10 }}
                />
                <Area yAxisId="left" type="monotone" dataKey="orders" stroke="hsl(330 80% 60%)" fill="transparent" strokeWidth={2} dot={false} name="orders" />
                <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(48 100% 52%)" fill="url(#colorRev)" strokeWidth={2} dot={false} name="revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-card-border bg-card p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top products by volume</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), "Stickers"]} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                  <Bar dataKey="qty" radius={[0, 6, 6, 0]}>
                    {topProducts.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-card-border bg-card p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order status</div>
              {statusBreakdown.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No orders yet</div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                    <PieChart width={180} height={180}>
                      <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {statusBreakdown.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "hsl(200 15% 60%)"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, String(name).replace(/_/g, " ")]} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                    </PieChart>
                  </div>
                  <ul className="flex-1 space-y-1.5 text-sm">
                    {statusBreakdown.map((s) => (
                      <li key={s.status} className="flex items-center justify-between gap-2">
                        <StatusBadge status={s.status} />
                        <span className="font-semibold">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-5">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finish preference</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={finishBreakdown} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="finish" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), "Stickers"]} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                  {finishBreakdown.map((entry, idx) => (
                    <Cell key={entry.finish} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
            <strong>Skill 2 · Secure Object ACLs:</strong> All customer artwork uploaded during checkout is stored with private visibility — served only via signed API routes at <code className="rounded bg-muted px-1 py-0.5">/api/storage/&lt;path&gt;</code>.
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div className="mt-6">
          {orders.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No orders yet.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-card-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{o.reference}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="mt-1 text-sm font-medium">{o.customerName}</div>
                      <div className="text-xs text-muted-foreground">{o.customerPhone} · {o.deliveryMethod ?? "Pickup"}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold">{formatNGN(o.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {o.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                        <span>{it.quantity} × {it.productName} ({it.sizeLabel}, {it.finishLabel})</span>
                        <span className="font-medium">{formatNGN(it.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={`/orders/${o.id}`}>
                    <button type="button" className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover-elevate">
                      View order <ExternalLink className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "customers" && (
        <div className="mt-6">
          {uniqueCustomers.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No customers yet.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-card-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Last order</th>
                    <th className="px-4 py-3 text-right">Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueCustomers.map((c, i) => {
                    const customerOrders = orders.filter((o) => o.customerPhone === c.customerPhone);
                    const totalSpent = customerOrders.reduce((s, o) => s + o.total, 0);
                    const lastOrder = customerOrders[0];
                    return (
                      <tr key={c.customerPhone} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                              {c.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{c.customerName}</div>
                              <div className="text-xs text-muted-foreground md:hidden">{c.customerPhone}</div>
                              <div className="text-xs text-muted-foreground">{customerOrders.length} order{customerOrders.length !== 1 ? "s" : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.customerPhone}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatNGN(totalSpent)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <strong>WhatsApp Business API hook:</strong> When integrated with the WhatsApp Business API, this table will sync with conversation history, allowing automated follow-ups, order status updates, and re-engagement campaigns directly from this CRM.
          </div>
        </div>
      )}
    </div>
  );
}
