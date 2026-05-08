import { Link } from "wouter";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useWishlist, useHasMounted } from "@/lib/wishlist";
import { Heart } from "lucide-react";

export function WishlistPage() {
  const slugs = useWishlist();
  const mounted = useHasMounted();
  const { data: allProducts } = useListProducts();

  const items = (allProducts ?? []).filter((p) => slugs.includes(p.slug));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <div className="flex items-center gap-2">
        <Heart className="h-6 w-6 fill-current text-accent" />
        <h1 className="font-serif text-3xl font-semibold md:text-4xl">Your wishlist</h1>
      </div>
      <p className="mt-2 text-muted-foreground">Stickers you've saved for later.</p>

      {!mounted ? null : items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-serif text-2xl font-semibold">Nothing saved yet</h2>
          <p className="mt-2 text-muted-foreground">Tap the heart on any sticker to save it here.</p>
          <Link href="/shop" className="mt-6 inline-block">
            <Button>Browse stickers</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <ProductCard key={p.slug} product={p} rotate={(i % 2 === 0 ? -1 : 1) * 1.5} />
          ))}
        </div>
      )}
    </div>
  );
}
