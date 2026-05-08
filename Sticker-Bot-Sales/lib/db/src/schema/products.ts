import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type SizeOption = {
  label: string;
  widthMm: number;
  heightMm: number;
  priceModifier: number;
};

export type FinishOption = {
  label: string;
  description: string;
  priceModifier: number;
};

export type QuantityTier = {
  minQty: number;
  unitPrice: number;
  label: string;
};

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  categorySlug: text("category_slug").notNull(),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  imageUrl: text("image_url").notNull(),
  material: text("material").notNull().default("Premium vinyl"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isBestseller: boolean("is_bestseller").notNull().default(false),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("4.8"),
  reviewCount: integer("review_count").notNull().default(0),
  sizes: jsonb("sizes").$type<SizeOption[]>().notNull().default([]),
  finishes: jsonb("finishes").$type<FinishOption[]>().notNull().default([]),
  quantityTiers: jsonb("quantity_tiers")
    .$type<QuantityTier[]>()
    .notNull()
    .default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
