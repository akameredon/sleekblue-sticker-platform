import { Link } from "wouter";
import type { Product } from "@workspace/api-client-react";
import { formatNGN } from "@/lib/format";
import { StickerImage } from "./StickerImage";
import { Eye, Heart, Star, TrendingUp } from "lucide-react";
import { wishlist, useWishlistHas, useHasMounted } from "@/lib/wishlist";

function seedHash(str: string, salt: number) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getProductSignals(slug: string) {
  const viewing = (seedHash(slug, 7) % 19) + 6;
  const weeklyOrders = (seedHash(slug, 13) % 44) + 18;
  const slotsLeft = (seedHash(slug, 31) % 5) + 2;
  const minutesAgo = (seedHash(slug, 17) % 55) + 4;
  return { viewing, weeklyOrders, slotsLeft, minutesAgo };
}

export function ProductCard({ product, rotate = 0 }: { product: Product; rotate?: number }) {
  const inWishlist = useWishlistHas(product.slug);
  const mounted = useHasMounted();
  const { viewing, weeklyOrders, slotsLeft, minutesAgo } = getProductSignals(product.slug);
  const isScarce = slotsLeft <= 3;

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-card-border bg-card gradient-border hover-elevate transition-shadow duration-300 group-hover:shadow-xl"
      data-testid={`card-product-${product.slug}`}
    >
      {/* Wishlist */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); wishlist.toggle(product.slug); }}
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur hover-elevate"
        data-testid={`button-wish-${product.slug}`}
      >
        <Heart className={mounted && inWishlist ? "h-4 w-4 fill-current text-accent" : "h-4 w-4 text-muted-foreground"} />
      </button>

      <Link href={`/p/${product.slug}`} className="flex flex-col p-4">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/60 grain">
          <StickerImage
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
            rotate={rotate}
          />

          {/* Top-left badge */}
          {product.isBestseller ? (
            <span className="absolute left-3 top-3 badge-hot sticker-rotate-1">🔥 Bestseller</span>
          ) : product.isFeatured ? (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground sticker-rotate-1">
              Featured
            </span>
          ) : null}

          {/* Viewing now — bottom overlay */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Eye className="h-3 w-3 text-accent" />
            {viewing} viewing now
          </div>
        </div>

        {/* Body */}
        <div className="mt-4 flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{product.categoryName}</div>
            {product.isBestseller && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-orange-500" />
                <span>{weeklyOrders} this week</span>
              </div>
            )}
          </div>

          <h3 className="font-serif text-lg font-semibold leading-tight">{product.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{product.tagline}</p>

          {/* Last order recency */}
          <p className="text-[11px] text-muted-foreground/70">Last ordered {minutesAgo}m ago</p>

          {/* Price + scarcity row */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground">From</div>
              <div className="font-semibold text-base">{formatNGN(product.basePrice)}</div>
              <div className="price-was">{formatNGN(Math.round(product.basePrice * 1.22))}</div>
            </div>

            <div className="flex flex-col items-end gap-1">
              {product.rating > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-current text-primary" />
                  <span>{product.rating.toFixed(1)}</span>
                  <span>·</span>
                  <span>{product.reviewCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Scarcity bar */}
          {isScarce && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-semibold text-orange-600 dark:text-orange-400">⚡ Only {slotsLeft} slots left this week</span>
              </div>
              <div className="scarcity-bar">
                <div className="scarcity-bar-fill" style={{ width: `${100 - slotsLeft * 14}%` }} />
              </div>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
