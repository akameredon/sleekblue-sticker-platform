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
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNGN } from "@/lib/format";
import { apiUrl } from "@/lib/paths";
import { BarChart2, ChevronLeft, Package, ShoppingBag, TrendingUp, Zap } from "lucide-react";

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

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "hsl(200 15% 60%)";
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

export function AdminPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/admin/analytics"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
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
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
        <h1 className="font-serif text-3xl font-semibold">Analytics unavailable</h1>
        <p className="mt-2 text-muted-foreground">{error ?? "Unknown error"}</p>
        <Link href="/"><button className="mt-6 rounded-lg border border-border px-4 py-2 text-sm hover-elevate">Go home</button></Link>
      </div>
    );
  }

  const { summary, dailyOrders, topProducts, statusBreakdown, finishBreakdown } = data;

  const METRICS = [
    { label: "Total orders", value: summary.totalOrders.toString(), icon: ShoppingBag, sub: `${summary.ordersThisMonth} this month` },
    { label: "Total revenue", value: formatNGN(summary.totalRevenue), icon: TrendingUp, sub: `${formatNGN(summary.revenueThisWeek)} this week` },
    { label: "Avg order value", value: formatNGN(summary.avgOrderValue), icon: Zap, sub: "per order" },
    { label: "Products in catalog", value: topProducts.length.toString(), icon: Package, sub: "active SKUs ordered" },
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
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skill 12 · Graphify Analytics</div>
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

      <div className="mt-6 rounded-2xl border border-card-border bg-card p-5">
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
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
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

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top products by volume</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number) => [v.toLocaleString(), "Stickers"]}
                contentStyle={{ fontSize: 12, borderRadius: 10 }}
              />
              <Bar dataKey="qty" radius={[0, 6, 6, 0]} fill="hsl(48 100% 52%)">
                {topProducts.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order status breakdown</div>
          {statusBreakdown.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No orders yet
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "hsl(200 15% 60%)"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name.replace(/_/g, " ")]}
                    contentStyle={{ fontSize: 12, borderRadius: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-1.5 text-sm">
                {statusBreakdown.map((s) => (
                  <li key={s.status} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <StatusDot status={s.status} />
                      <span className="capitalize">{s.status.replace(/_/g, " ")}</span>
                    </span>
                    <span className="font-semibold">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-card-border bg-card p-5">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finish preference (total stickers by finish)</div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={finishBreakdown} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="finish" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              formatter={(v: number) => [v.toLocaleString(), "Stickers"]}
              contentStyle={{ fontSize: 12, borderRadius: 10 }}
            />
            <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
              {finishBreakdown.map((entry, idx) => (
                <Cell key={entry.finish} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        <strong>Skill 2 · Secure Object ACLs:</strong> All customer artwork uploaded during checkout is stored with private visibility — accessible only via signed API routes at <code className="rounded bg-muted px-1 py-0.5">/api/storage/&lt;path&gt;</code>. Artworks are never served from a public CDN and are scoped per-order.
      </div>
    </div>
  );
}
