import { Link, useLocation } from "wouter";
import { Heart, Menu, MessageCircle, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useGetShopInfo } from "@workspace/api-client-react";
import { useCartCount, useHasMounted } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/whatsapp";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/track", label: "Track order" },
  { href: "/chat", label: "Chat with AI" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: shop } = useGetShopInfo();
  const cartCount = useCartCount();
  const wishlistCount = useWishlist().length;
  const mounted = useHasMounted();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-1.5 py-1 -ml-1.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-lg sticker-rotate-2">
              SL
            </span>
            <span className="font-serif text-lg font-semibold leading-none">
              {shop?.businessName ?? "Sticker Lab"}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium hover-elevate ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                  data-testid={`nav-${item.href.replace(/\W/g, "") || "home"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link href="/wishlist" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" className="relative" data-testid="button-wishlist">
                <Heart className={mounted && wishlistCount > 0 ? "h-4 w-4 fill-current text-accent" : "h-4 w-4"} />
                {mounted && wishlistCount > 0 ? (
                  <span className="ml-1 text-[11px] font-semibold">{wishlistCount}</span>
                ) : null}
              </Button>
            </Link>
            <Link href="/cart">
              <Button variant="outline" size="sm" className="relative" data-testid="button-cart">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Cart</span>
                {mounted && cartCount > 0 ? (
                  <span className="ml-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-foreground">
                    {cartCount}
                  </span>
                ) : null}
              </Button>
            </Link>
            <Link href="/chat" className="hidden sm:inline-flex">
              <Button size="sm" data-testid="button-chat-cta">
                <MessageCircle className="h-4 w-4" />
                Chat
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden grid h-9 w-9 place-items-center rounded-md hover-elevate"
              aria-label="Open menu"
              data-testid="button-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open ? (
          <div className="border-t border-border md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium hover-elevate"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold sticker-rotate-3">
                  SL
                </span>
                <span className="font-serif text-lg font-semibold">
                  {shop?.businessName ?? "Sticker Lab"}
                </span>
              </div>
              <p className="mt-3 max-w-md text-sm text-sidebar-foreground/75">
                {shop?.tagline}
              </p>
              {shop ? (
                <a
                  href={whatsappUrl(shop.whatsappNumber, "Hi! I'd like to ask about a sticker order.")}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover-elevate"
                  data-testid="link-whatsapp-footer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp · {shop.whatsappDisplay}
                </a>
              ) : null}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                Studio
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li>{shop?.location}</li>
                <li>{shop?.hours}</li>
                <li>{shop?.email}</li>
                <li>{shop?.instagram}</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                Shop
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/shop" className="hover:underline">All stickers</Link></li>
                <li><Link href="/chat" className="hover:underline">Custom quote</Link></li>
                <li><Link href="/track" className="hover:underline">Track an order</Link></li>
                <li><Link href="/wishlist" className="hover:underline">Wishlist</Link></li>
                <li><Link href="/cart" className="hover:underline">Your cart</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/60 md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} {shop?.businessName ?? "Sticker Lab"}. All rights reserved.</span>
            <span>{shop?.deliveryNote}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
