import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { BarChart2, Menu, MessageCircle, Palette, PackageCheck, X } from "lucide-react";
import { getUser, type AuthUser } from "@/lib/auth";
import { whatsappUrl } from "@/lib/whatsapp";

const PHONE = "2348058162036";
const NAV = [
  { href: "/", label: "Home" },
  { href: "/generate", label: "Design a label" },
  { href: "/track", label: "Track an order" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(getUser());
    setMenuOpen(false);
  }, [location]);

  const helpLink = whatsappUrl(PHONE, "Hello. I need help with my product label or sticker order.");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <PackageCheck className="h-5 w-5"/>
            </span>
            <span className="text-base md:text-lg">Product Label Studio</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${location === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                {item.label}
              </Link>
            ))}
            {authUser?.isAdmin && (
              <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                <BarChart2 className="mr-1 inline h-4 w-4"/> Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <a href={helpLink} target="_blank" rel="noreferrer"
              className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-flex">
              <MessageCircle className="h-4 w-4"/> WhatsApp help
            </a>
            <button type="button" onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-border md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}>
              {menuOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-background px-4 py-3 md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}
                  className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-muted">
                  {item.label}
                </Link>
              ))}
              {authUser?.isAdmin && <Link href="/admin" className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-muted">Admin dashboard</Link>}
              <a href={helpLink} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground">
                <MessageCircle className="h-4 w-4"/> Chat with us on WhatsApp
              </a>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t border-border bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <div className="font-semibold">Product Label Studio</div>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Design your product label on your phone. Printing, cutting and packaging handled with Sleekblue Media Houz.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            WhatsApp <a className="font-semibold text-foreground" href={helpLink} target="_blank" rel="noreferrer">+234 805 816 2036</a>
            <div className="mt-1">Nigeria-wide enquiries · Delivery and production dates confirmed before payment</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
