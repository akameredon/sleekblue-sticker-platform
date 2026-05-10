import { Link, useLocation } from "wouter";
import { BarChart2, Heart, Layers, Menu, MessageCircle, ShoppingBag, Wand2, X, Zap, User, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { useGetShopInfo } from "@workspace/api-client-react";
import { useCartCount, useHasMounted } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/whatsapp";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { FloatingChat } from "@/components/FloatingChat";
import { getUser, clearAuth, type AuthUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/quick-order", label: "Quick Order" },
  { href: "/track", label: "Track" },
  { href: "/chat", label: "AI Chat" },
  { href: "/generate", label: "AI Design" },
  { href: "/batch", label: "Batch Quote" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: shop } = useGetShopInfo();
  const cartCount = useCartCount();
  const wishlistCount = useWishlist().length;
  const mounted = useHasMounted();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Re-read auth on every navigation (lightweight localStorage read)
  useEffect(() => {
    setAuthUser(getUser());
  }, [location]);

  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-1.5 py-1 -ml-1.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-lg sticker-rotate-2">
              SL
            </span>
            <span className="font-serif text-lg font-semibold leading-none hidden sm:inline">
              {shop?.businessName ?? "Sticker Lab"}
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 xl:flex">
            {NAV.map((item) => {
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2.5 py-2 text-sm font-medium hover-elevate ${active ? "text-foreground" : "text-muted-foreground"}`}
                  data-testid={`nav-${item.href.replace(/\W/g, "") || "home"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link href="/quick-order" className="hidden md:inline-flex">
              <Button size="sm" variant="outline" className="gap-1.5 border-accent/40 text-accent hover:bg-accent/5" data-testid="button-quick-order-nav">
                <Zap className="h-3.5 w-3.5" /> Quick Order
              </Button>
            </Link>
            <Link href="/admin" className="hidden md:inline-flex">
              <Button variant="outline" size="sm" title="Analytics" data-testid="button-admin">
                <BarChart2 className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/wishlist" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" className="relative" data-testid="button-wishlist">
                <Heart className={mounted && wishlistCount > 0 ? "h-4 w-4 fill-current text-accent" : "h-4 w-4"} />
                {mounted && wishlistCount > 0 && <span className="ml-1 text-[11px] font-semibold">{wishlistCount}</span>}
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="outline" size="sm" className="relative" data-testid="button-cart">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Cart</span>
                {mounted && cartCount > 0 && (
                  <span className="ml-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Auth button */}
            {mounted && (
              authUser ? (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Link href="/account">
                    <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-account">
                      <User className="h-3.5 w-3.5" />
                      <span className="hidden md:inline max-w-[80px] truncate">{authUser.name.split(" ")[0]}</span>
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href="/login" className="hidden sm:inline-flex">
                  <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-login">
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Sign in</span>
                  </Button>
                </Link>
              )
            )}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="xl:hidden grid h-9 w-9 place-items-center rounded-md hover-elevate"
              aria-label="Open menu"
              data-testid="button-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border xl:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium hover-elevate ${
                    location === item.href || (item.href !== "/" && location.startsWith(item.href))
                      ? "text-foreground bg-muted/40" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> Analytics
              </Link>
              <Link href="/wishlist" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate flex items-center gap-2">
                <Heart className="h-4 w-4" /> Wishlist
              </Link>
              {authUser ? (
                <>
                  <Link href="/account" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate flex items-center gap-2">
                    <User className="h-4 w-4" /> My Account ({authUser.name.split(" ")[0]})
                  </Link>
                  <button type="button" onClick={() => { handleLogout(); setOpen(false); }} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate flex items-center gap-2 text-left">
                    <LogIn className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold sticker-rotate-3">SL</span>
                <span className="font-serif text-lg font-semibold">{shop?.businessName ?? "Sticker Lab"}</span>
              </div>
              <p className="mt-3 max-w-md text-sm text-sidebar-foreground/75">{shop?.tagline}</p>
              {shop && (
                <a href={whatsappUrl(shop.whatsappNumber, "Hi! I'd like to ask about a sticker order.")} target="_blank" rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover-elevate"
                  data-testid="link-whatsapp-footer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp · {shop.whatsappDisplay}
                </a>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">Studio</div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>{shop?.location}</li>
                <li>{shop?.hours}</li>
                <li>{shop?.email}</li>
                <li>{shop?.instagram}</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">Shop</div>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/shop" className="hover:underline">All stickers</Link></li>
                <li><Link href="/quick-order" className="hover:underline flex items-center gap-1"><Zap className="h-3 w-3" />Quick order</Link></li>
                <li><Link href="/generate" className="hover:underline flex items-center gap-1"><Wand2 className="h-3 w-3" />AI sticker generator</Link></li>
                <li><Link href="/batch" className="hover:underline flex items-center gap-1"><Layers className="h-3 w-3" />Batch quote</Link></li>
                <li><Link href="/chat" className="hover:underline">AI shopping chat</Link></li>
                <li><Link href="/track" className="hover:underline">Track an order</Link></li>
                <li><Link href="/account" className="hover:underline flex items-center gap-1"><User className="h-3 w-3" />My account</Link></li>
                <li><Link href="/admin" className="hover:underline flex items-center gap-1"><BarChart2 className="h-3 w-3" />Admin dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/60 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} {shop?.businessName ?? "Sticker Lab"}. All rights reserved.</span>
            <span>{shop?.deliveryNote}</span>
          </div>
        </div>
      </footer>

      <FloatingChat />
      <VoiceAssistant />
    </div>
  );
}
