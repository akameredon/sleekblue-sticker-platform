import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  CreateProductReviewBody,
  CreateProductReviewParams,
  ListProductReviewsParams,
} from "@workspace/api-zod";
import { db, schema } from "../lib/db";

const router: IRouter = Router();

function serializeReview(r: typeof schema.reviews.$inferSelect) {
  return {
    id: r.id,
    productSlug: r.productSlug,
    customerName: r.customerName,
    customerEmail: r.customerEmail ?? undefined,
    rating: r.rating,
    title: r.title ?? undefined,
    body: r.body,
    createdAt: r.createdAt,
  };
}

router.get("/products/:slug/reviews", async (req, res) => {
  const { slug } = ListProductReviewsParams.parse(req.params);
  const rows = await db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.productSlug, slug))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(50);
  res.json(rows.map(serializeReview));
});

router.post("/products/:slug/reviews", async (req, res) => {
  const { slug } = CreateProductReviewParams.parse(req.params);
  const body = CreateProductReviewBody.parse(req.body);

  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [row] = await db
    .insert(schema.reviews)
    .values({
      productSlug: slug,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      rating: body.rating,
      title: body.title,
      body: body.body,
    })
    .returning();

  // Recompute aggregate rating + count
  const [agg] = await db
    .select({
      avg: sql<string>`avg(${schema.reviews.rating})::numeric(3,2)`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.reviews)
    .where(eq(schema.reviews.productSlug, slug));

  if (agg) {
    await db
      .update(schema.products)
      .set({
        rating: agg.avg ?? "5.00",
        reviewCount: agg.count ?? 0,
      })
      .where(eq(schema.products.slug, slug));
  }

  res.status(201).json(serializeReview(row!));
});

export default router;
