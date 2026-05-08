import { Link } from "wouter";
import type { Product } from "@workspace/api-client-react";
import { formatNGN } from "@/lib/format";
import { StickerImage } from "./StickerImage";
import { Heart, Star } from "lucide-react";
import { wishlist, useWishlistHas, useHasMounted } from "@/lib/wishlist";

export function ProductCard({ product, rotate = 0 }: { product: Product; rotate?: number }) {
  const inWishlist = useWishlistHas(product.slug);
  const mounted = useHasMounted();

  return (
    <div className="group relative flex flex-col rounded-2xl border border-card-border bg-card p-4 hover-elevate" data-testid={`card-product-${product.slug}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          wishlist.toggle(product.slug);
        }}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur hover-elevate"
        data-testid={`button-wish-${product.slug}`}
      >
        <Heart
          className={
            mounted && inWishlist
              ? "h-4 w-4 fill-current text-accent"
              : "h-4 w-4 text-muted-foreground"
          }
        />
      </button>
      <Link
        href={`/p/${product.slug}`}
        className="flex flex-col"
      >
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/60 grain">
          <StickerImage
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            rotate={rotate}
          />
          {product.isBestseller ? (
            <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground sticker-rotate-1">
              Bestseller
            </span>
          ) : product.isFeatured ? (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground sticker-rotate-1">
              Featured
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-1 flex-col gap-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {product.categoryName}
          </div>
          <h3 className="font-serif text-lg font-semibold leading-tight">{product.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{product.tagline}</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground">From</div>
              <div className="font-semibold text-base">{formatNGN(product.basePrice)}</div>
            </div>
            {product.rating > 0 ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-current text-primary" />
                <span>{product.rating.toFixed(1)}</span>
                <span>·</span>
                <span>{product.reviewCount}</span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
