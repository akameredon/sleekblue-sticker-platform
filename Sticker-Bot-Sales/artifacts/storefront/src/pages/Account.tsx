/**
 * Account.tsx — Customer account dashboard.
 * Shows profile, order history, and allows profile updates.
 * Redirects to /login if not authenticated.
 */
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/paths";
import { getToken, getUser, setAuth, clearAuth, type AuthUser } from "@/lib/auth";
import { formatNGN } from "@/lib/format";
import { Loader2, LogOut, Package, User, ChevronRight, CheckCircle2, Clock, Truck } from "lucide-react";

type Order = {
  id: number;
  reference: string;
  status: string;
  total: number;
  createdAt: string;
  items: { productName: string; quantity: number; sizeLabel: string; finishLabel: string; lineTotal: number }[];
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  confirmed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  in_production: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  shipped: <Truck className="h-3.5 w-3.5 text-purple-500" />,
  delivered: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  pending_whatsapp: <Clock className="h-3.5 w-3.5 text-amber-500" />,
};

export function AccountPage() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(getUser());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!getToken()) { navigate("/login"); return; }
    const token = getToken()!;
    // Load profile + orders concurrently
    Promise.all([
      fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(apiUrl("/orders"), { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([profile, orderData]) => {
        if (profile?.id) {
          setUser(profile as AuthUser);
          setEditName(profile.name);
        }
        setOrders(Array.isArray(orderData) ? (orderData as Order[]) : []);
      })
      .catch(() => { /* show cached data */ })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName === user?.name) { setEditing(false); return; }
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (res.ok && user) {
        const updated = { ...user, name: data.name };
        setUser(updated);
        setAuth(getToken()!, updated);
        setSaveMsg("Saved!");
        setEditing(false);
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      {/* Profile card */}
      <div className="rounded-2xl border border-card-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              {editing ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              ) : (
                <div className="font-semibold">{user?.name}</div>
              )}
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={handleSaveProfile} disabled={saving} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50 hover-elevate">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditing(false); setEditName(user?.name ?? ""); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover-elevate">Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover-elevate">
                <User className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button onClick={handleLogout} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover-elevate">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        {saveMsg && <p className="mt-2 text-xs text-green-600">{saveMsg}</p>}
      </div>

      {/* Order history */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
          <Package className="h-5 w-5" /> Your orders
        </h2>
        {orders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link href="/shop" className="font-medium text-primary hover:underline">Browse the shop</Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`}>
                <div className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4 hover-elevate cursor-pointer">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.reference}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        {STATUS_ICONS[o.status]}
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {o.items.length} item{o.items.length !== 1 ? "s" : ""} ·{" "}
                      {new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatNGN(o.total)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
