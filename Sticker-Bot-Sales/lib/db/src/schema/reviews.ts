import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productSlug: text("product_slug").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    isPublished: integer("is_published").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    productSlugIdx: index("reviews_product_slug_idx").on(t.productSlug),
  }),
);

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
