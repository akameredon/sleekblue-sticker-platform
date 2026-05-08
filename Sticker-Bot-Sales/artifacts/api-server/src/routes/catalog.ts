import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import {
  GetProductBySlugParams,
  ListCategoriesResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  ListFeaturedProductsResponse,
  ListBestsellerProductsResponse,
} from "@workspace/api-zod";
import { db, schema } from "../lib/db";

const router: IRouter = Router();

async function categoryNameMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(schema.categories);
  return Object.fromEntries(rows.map((c) => [c.slug, c.name]));
}

function serializeProduct(
  p: typeof schema.products.$inferSelect,
  categoryName: string,
) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    categorySlug: p.categorySlug,
    categoryName,
    basePrice: Number(p.basePrice),
    currency: p.currency,
    imageUrl: p.imageUrl,
    material: p.material,
    isFeatured: p.isFeatured,
    isBestseller: p.isBestseller,
    rating: Number(p.rating),
    reviewCount: p.reviewCount,
    sizes: p.sizes,
    finishes: p.finishes,
    quantityTiers: p.quantityTiers,
    tags: p.tags,
  };
}

router.get("/categories", async (_req, res) => {
  const cats = await db
    .select()
    .from(schema.categories)
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));

  const counts = await db
    .select({
      categorySlug: schema.products.categorySlug,
      value: sql<number>`count(*)::int`,
    })
    .from(schema.products)
    .groupBy(schema.products.categorySlug);
  const countMap = Object.fromEntries(counts.map((c) => [c.categorySlug, c.value]));

  const data = ListCategoriesResponse.parse(
    cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      productCount: countMap[c.slug] ?? 0,
    })),
  );
  res.json(data);
});

router.get("/products", async (req, res) => {
  const params = ListProductsQueryParams.parse(req.query);
  const filters = [];
  if (params.category) filters.push(eq(schema.products.categorySlug, params.category));
  if (params.search) {
    const q = `%${params.search}%`;
    filters.push(
      or(
        ilike(schema.products.name, q),
        ilike(schema.products.tagline, q),
        ilike(schema.products.description, q),
      )!,
    );
  }
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db
    .select()
    .from(schema.products)
    .where(where)
    .orderBy(asc(schema.products.sortOrder), asc(schema.products.name));
  const names = await categoryNameMap();
  const data = ListProductsResponse.parse(
    rows.map((p) => serializeProduct(p, names[p.categorySlug] ?? p.categorySlug)),
  );
  res.json(data);
});

router.get("/products/featured", async (_req, res) => {
  const rows = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.isFeatured, true))
    .orderBy(asc(schema.products.sortOrder));
  const names = await categoryNameMap();
  const data = ListFeaturedProductsResponse.parse(
    rows.map((p) => serializeProduct(p, names[p.categorySlug] ?? p.categorySlug)),
  );
  res.json(data);
});

router.get("/products/bestsellers", async (_req, res) => {
  const rows = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.isBestseller, true))
    .orderBy(asc(schema.products.sortOrder));
  const names = await categoryNameMap();
  const data = ListBestsellerProductsResponse.parse(
    rows.map((p) => serializeProduct(p, names[p.categorySlug] ?? p.categorySlug)),
  );
  res.json(data);
});

router.get("/products/:slug", async (req, res) => {
  const { slug } = GetProductBySlugParams.parse(req.params);
  const [row] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const names = await categoryNameMap();
  res.json(serializeProduct(row, names[row.categorySlug] ?? row.categorySlug));
});

export default router;
