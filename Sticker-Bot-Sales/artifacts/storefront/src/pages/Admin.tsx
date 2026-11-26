/**
 * Admin.tsx — Full Admin Dashboard with AI Operations metrics.
 *
 * Tabs:
 * - Overview: revenue + order analytics
 * - Orders: full order list with status management
 * - Customers: CRM with spend totals
 * - AI Ops: conversation stats, WhatsApp threads
 * - Products: catalog management (add/edit/delete)
 * - Settings: shop settings editor
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNGN } from "@/lib/format";
import { apiUrl } from "@/lib/paths";
import { authHeaders } from "@/lib/auth";
import {
  BarChart2, ChevronLeft, ExternalLink, Package, ShoppingBag,
  TrendingUp, Users, Zap, MessageSquare, Bot, Settings,
  CheckCircle2, Edit2, Trash2, Plus, Save, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Analytics = {
  dailyOrders: { date: string; orders: number; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
  finishBreakdown: { finish: string; qty: number }[];
  summary: { totalOrders: number; totalRevenue: number; avgOrderValue: number; revenueThisWeek: number; ordersThisMonth: number; revenueThisMonth: number };
};

type Order = {
  id: number; reference: string; customerName: string; customerPhone: string;
  deliveryMethod?: string; subtotal: number; total: number; status: string;
  createdAt: string;
  items: { productName: string; quantity: number; sizeLabel: string; finishLabel: string; lineTotal: number }[];
};

type AiMetrics = {
  webChat: { totalConversations: number; totalMessages: number; avgMessagesPerConversation: number; conversationsLast7Days: number; assistantMessages: number };
  whatsApp: { totalMessages: number; inbound: number; outbound: number };
  recentConversations: { id: number; title: string; messageCount: number; createdAt: string }[];
};

type Customer = { name: string; phone: string; email: string | null; orders: number; totalSpent: number; lastOrderAt: string };
type Product = { id: number; name: string; slug: string; tagline: string; basePrice: string; isFeatured: boolean; isBestseller: boolean; sortOrder: number };
type ShopSettings = { businessName: string; tagline: string; whatsappNumber: string; whatsappDisplay: string; email: string | null; location: string; hours: string; instagram: string | null; deliveryNote: string | null; leadTimeDays: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "hsl(35 90% 55%)", pending_whatsapp: "hsl(48 100% 52%)", confirmed: "hsl(145 65% 48%)",
  in_production: "hsl(210 80% 56%)", ready: "hsl(175 60% 45%)", shipped: "hsl(270 60% 58%)",
  delivered: "hsl(150 60% 46%)", cancelled: "hsl(0 70% 55%)",
};
const CHART_COLORS = ["hsl(48 100% 52%)", "hsl(330 80% 60%)", "hsl(210 80% 56%)", "hsl(145 65% 48%)", "hsl(270 60% 58%)", "hsl(30 90% 55%)", "hsl(190 70% 50%)", "hsl(0 70% 55%)"];
const ALL_STATUSES = ["pending_payment", "pending_whatsapp", "confirmed", "in_production", "ready", "shipped", "delivered", "cancelled"];

function shortDate(iso: string) { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}`; }

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "hsl(200 15% 60%)";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize" style={{ background: `${color}20`, color }}>
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [aiMetrics, setAiMetrics] = useState<AiMetrics | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "orders" | "customers" | "ai-ops" | "products" | "settings">("overview");
  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<Partial<ShopSettings>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, o, ai, c, p, s] = await Promise.all([
        fetch(apiUrl("/admin/analytics"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(apiUrl("/admin/orders?limit=50"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(apiUrl("/admin/ai-metrics"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(apiUrl("/admin/customers"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(apiUrl("/admin/products"), { headers: authHeaders() }).then((r) => r.json()),
        fetch(apiUrl("/admin/settings"), { headers: authHeaders() }).then((r) => r.json()),
      ]);
      setAnalytics(a);
      setOrders(Array.isArray(o.orders) ? o.orders : []);
      setAiMetrics(ai);
      setCustomers(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
      setSettings(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateOrderStatus = async (id: number, status: string) => {
    setUpdatingOrder(id);
    try {
      const res = await fetch(apiUrl(`/admin/orders/${id}`), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
      }
    } finally { setUpdatingOrder(null); }
  };

  const saveSettings = async () => {
    if (!settingsDraft || Object.keys(settingsDraft).length === 0) { setEditingSettings(false); return; }
    setSavingSettings(true);
    try {
      const res = await fetch(apiUrl("/admin/settings"), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(settingsDraft),
      });
      const updated = await res.json();
      if (res.ok) { setSettings(updated); setEditingSettings(false); setSettingsDraft({}); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); }
    } finally { setSavingSettings(false); }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    await fetch(apiUrl(`/admin/products/${id}`), { method: "DELETE", headers: authHeaders() });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 space-y-4">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  if (error || !analytics) return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
      <h1 className="font-serif text-3xl font-semibold">Dashboard unavailable</h1>
      <p className="mt-2 text-muted-foreground">{error ?? "Unknown error"}</p>
    </div>
  );

  const { summary, dailyOrders, topProducts, statusBreakdown, finishBreakdown } = analytics;

  const METRICS = [
    { label: "Total orders", value: summary.totalOrders.toString(), icon: ShoppingBag, sub: `${summary.ordersThisMonth} this month` },
    { label: "Total revenue", value: formatNGN(summary.totalRevenue), icon: TrendingUp, sub: `${formatNGN(summary.revenueThisWeek)} this week` },
    { label: "Avg order value", value: formatNGN(summary.avgOrderValue), icon: Zap, sub: "per order" },
    { label: "Customers", value: customers.length.toString(), icon: Users, sub: `${topProducts.length} active SKUs` },
  ];

  const TABS = [
    { id: "overview" as const, label: "Overview", icon: BarChart2 },
    { id: "orders" as const, label: `Orders (${orders.length})`, icon: Package },
    { id: "customers" as const, label: `Customers (${customers.length})`, icon: Users },
    { id: "ai-ops" as const, label: "AI Ops", icon: Bot },
    { id: "products" as const, label: "Products", icon: ShoppingBag },
    { id: "settings" as const, label: "Settings", icon: Settings },
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
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">Studio Dashboard</h1>
          <p className="text-xs text-muted-foreground">Full-stack operations · AI sales · WhatsApp CRM</p>
        </div>
      </header>

      {/* KPI cards */}
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

      {/* Tabs */}
      <div className="mt-6 flex gap-0.5 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex-shrink-0 ${
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-card-border bg-card p-5">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Orders & revenue — last 30 days</div>
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
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number, name: string) => name === "revenue" ? [formatNGN(value), "Revenue"] : [value, "Orders"]} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
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
                    {topProducts.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-card-border bg-card p-5">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order status distribution</div>
              {statusBreakdown.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No orders yet</div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                    <PieChart width={180} height={180}>
                      <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {statusBreakdown.map((entry) => <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "hsl(200 15% 60%)"} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, String(name).replace(/_/g, " ")]} contentStyle={{ fontSize: 12, borderRadius: 10 }} />
                    </PieChart>
                  </div>
                  <ul className="flex-1 space-y-1.5 text-sm">
                    {statusBreakdown.map((s) => (
                      <li key={s.status} className="flex items-center justify-between gap-2">
                        <StatusBadge status={s.status} /> <span className="font-semibold">{s.count}</span>
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
                  {finishBreakdown.map((entry, idx) => <Cell key={entry.finish} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Orders ── */}
      {tab === "orders" && (
        <div className="mt-6 space-y-3">
          {orders.length === 0 ? <div className="py-20 text-center text-muted-foreground">No orders yet.</div> : orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-card-border bg-card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold">{o.reference}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-1 text-sm font-medium">{o.customerName}</div>
                  <div className="text-xs text-muted-foreground">{o.customerPhone} · {o.deliveryMethod ?? "Pickup"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={o.status}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                    disabled={updatingOrder === o.id}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatNGN(o.total)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</div>
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
                <button type="button" className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  View full order <ExternalLink className="h-3 w-3" />
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Customers ── */}
      {tab === "customers" && (
        <div className="mt-6">
          {customers.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No customers yet.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-card-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Phone</th>
                    <th className="px-4 py-3 text-center">Orders</th>
                    <th className="px-4 py-3 text-right">Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={c.phone} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.phone}</td>
                      <td className="px-4 py-3 text-center">{c.orders}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatNGN(c.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── AI Ops ── */}
      {tab === "ai-ops" && aiMetrics && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Web conversations", value: aiMetrics.webChat.totalConversations, sub: `${aiMetrics.webChat.conversationsLast7Days} this week` },
              { label: "Messages total", value: aiMetrics.webChat.totalMessages, sub: `Avg ${aiMetrics.webChat.avgMessagesPerConversation} per conv` },
              { label: "WhatsApp messages", value: aiMetrics.whatsApp.totalMessages, sub: `${aiMetrics.whatsApp.inbound} in / ${aiMetrics.whatsApp.outbound} out` },
              { label: "AI replies", value: aiMetrics.webChat.assistantMessages, sub: "by assistant" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-card-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                </div>
                <div className="mt-2 font-serif text-2xl font-semibold">{m.value.toLocaleString()}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{m.sub}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent web conversations</span>
            </div>
            {aiMetrics.recentConversations.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              <div className="space-y-2">
                {aiMetrics.recentConversations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5">
                    <div>
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{c.messageCount} msgs</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
            <strong>WhatsApp two-way AI:</strong> When WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are set, the AI agent automatically replies to inbound WhatsApp messages using the same tools as the web chat. Set webhook URL in Meta Dashboard to <code className="rounded bg-muted px-1 py-0.5">/api/whatsapp/webhook</code>.
          </div>
        </div>
      )}

      {/* ── Products ── */}
      {tab === "products" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{products.length} products</span>
            <Link href="/admin">
              <button type="button" className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover-elevate">
                <Plus className="h-3.5 w-3.5" /> Add product (via API)
              </button>
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-card-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Slug</th>
                  <th className="px-4 py-3 text-right">Base price</th>
                  <th className="px-4 py-3 text-center">Featured</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.tagline}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{p.slug}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatNGN(Number(p.basePrice))}</td>
                    <td className="px-4 py-3 text-center">
                      {p.isFeatured ? <CheckCircle2 className="h-4 w-4 text-green-500 inline" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/p/${p.slug}`}>
                          <button type="button" className="grid h-7 w-7 place-items-center rounded-lg border border-border hover-elevate" title="View">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                        <button type="button" onClick={() => deleteProduct(p.id)} className="grid h-7 w-7 place-items-center rounded-lg border border-destructive/30 text-destructive hover-elevate" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Settings ── */}
      {tab === "settings" && settings && (
        <div className="mt-6 max-w-2xl">
          <div className="rounded-2xl border border-card-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Shop settings</h2>
              <div className="flex items-center gap-2">
                {settingsSaved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Saved</span>}
                {editingSettings ? (
                  <>
                    <button onClick={saveSettings} disabled={savingSettings} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover-elevate">
                      <Save className="h-3.5 w-3.5" />{savingSettings ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => { setEditingSettings(false); setSettingsDraft({}); }} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover-elevate">
                      <X className="h-3.5 w-3.5" />Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setEditingSettings(true); setSettingsDraft({ ...settings }); }} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover-elevate">
                    <Edit2 className="h-3.5 w-3.5" />Edit
                  </button>
                )}
              </div>
            </div>

            {(Object.keys(settings) as (keyof ShopSettings)[]).map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</label>
                {editingSettings ? (
                  <input
                    type={key === "leadTimeDays" ? "number" : "text"}
                    value={String(settingsDraft[key] ?? "")}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, [key]: key === "leadTimeDays" ? Number(e.target.value) : e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <div className="rounded-xl bg-muted/30 px-3 py-2 text-sm">{String(settings[key] ?? "—")}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
