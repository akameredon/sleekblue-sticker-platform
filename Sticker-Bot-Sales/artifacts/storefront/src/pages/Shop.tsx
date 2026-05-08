import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListCategories,
  useListProducts,
} from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

function useQueryParam(key: string): string | null {
  const [location] = useLocation();
  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  void location;
  return url ? url.searchParams.get(key) : null;
}

export function ShopPage() {
  const initialCategory = useQueryParam("category") ?? "all";
  const [category, setCategory] = useState<string>(initialCategory);
  const [search, setSearch] = useState<string>("");

  const { data: categories } = useListCategories();
  const { data: products, isLoading } = useListProducts({
    ...(category !== "all" ? { category } : {}),
  });

  // Sync category state with URL changes (e.g., browser back button)
  useEffect(() => {
    const param = initialCategory;
    if (param !== category) {
      if (param === "all") {
        setCategory("all");
      } else if (categories && categories.some((c) => c.slug === param)) {
        // Only sync if the category is recognized by the backend
        setCategory(param);
      }
    }
  }, [initialCategory, categories]);

  const filtered = useMemo(() => {
    const list = products ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [products, search]);

  const onPickCategory = (slug: string) => {
    setCategory(slug);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (slug === "all") url.searchParams.delete("category");
      else url.searchParams.set("category", slug);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shop</div>
          <h1 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">All stickers</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Browse our catalog. Tap a sticker to size, finish, and price live before sending the order to WhatsApp.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stickers"
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </header>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 scrollbar-thin md:mx-0 md:px-0">
        <div className="flex gap-2 pb-2">
          <CategoryPill label="All" active={category === "all"} onClick={() => onPickCategory("all")} count={products?.length ?? 0} />
          {(categories ?? []).map((c) => (
            <CategoryPill
              key={c.slug}
              label={c.name}
              active={category === c.slug}
              count={c.productCount}
              onClick={() => onPickCategory(c.slug)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[420px] rounded-2xl" />)
          : filtered.length === 0
            ? (
              <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                No stickers match. Try a different category or clear your search.
              </div>
            )
            : filtered.map((p, i) => (
                <ProductCard key={p.slug} product={p} rotate={(i % 3 - 1) * 1.5} />
              ))}
      </div>
    </div>
  );
}

function CategoryPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors hover-elevate ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground"
      }`}
      data-testid={`pill-cat-${label.toLowerCase().replace(/\W+/g, "-")}`}
    >
      {label}
      {count != null ? (
        <span className={`ml-1.5 text-xs ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
