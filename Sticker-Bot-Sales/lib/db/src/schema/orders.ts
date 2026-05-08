import {
  pgTable,
  serial,
  text,
  numeric,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type OrderItem = {
  productSlug?: string;
  productName: string;
  sizeLabel: string;
  finishLabel: string;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
};

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  deliveryAddress: text("delivery_address"),
  deliveryMethod: text("delivery_method").default("Pickup"),
  notes: text("notes"),
  items: jsonb("items").$type<OrderItem[]>().notNull().default([]),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  deliveryFee: numeric("delivery_fee", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  currencySymbol: text("currency_symbol").notNull().default("₦"),
  status: text("status").notNull().default("pending_whatsapp"),
  whatsappMessage: text("whatsapp_message"),
  artworkUrls: jsonb("artwork_urls").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
